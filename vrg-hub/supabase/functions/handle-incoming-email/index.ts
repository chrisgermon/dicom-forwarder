import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IncomingEmail {
  sender: string;
  recipient: string;
  subject: string;
  'body-plain': string;
  'body-html'?: string;
  'stripped-text'?: string;
  'Message-Id': string;
  'In-Reply-To'?: string;
  'References'?: string;
}

/**
 * Clean email content by removing signatures, disclaimers, and CID references
 */
function cleanEmailContent(content: string): string {
  if (!content) return '';
  
  let cleaned = content;
  
  // Remove [cid:...] image references
  cleaned = cleaned.replace(/\[cid:[^\]]+\]/gi, '');
  
  // Remove email signature patterns
  const signaturePatterns = [
    // Phone numbers
    /\(\d{2}\)\s*\d{4}\s*\d{4}/g,
    // Email addresses (but keep the main request text)
    /[\w\.-]+@[\w\.-]+\.\w+/g,
    // Website URLs
    /https?:\/\/[\w\.-]+\.\w+[\w\-\._~:\/?#\[\]@!\$&'\(\)\*\+,;=]*/gi,
  ];
  
  // Split by common signature delimiters
  const lines = cleaned.split('\n');
  const cleanedLines: string[] = [];
  let inSignature = false;
  let requestContent = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect signature start
    if (!inSignature && (
      line.match(/^[-_]{2,}$/) || // Separator lines
      line.match(/^(regards|thanks|sincerely|best|cheers)/i) || // Common closings
      line.match(/\|\s*[\w\s]+$/i) || // Job titles with pipe
      line.includes('accepts no liability') || // Legal disclaimers
      line.match(/^\d+\/\d+.*VIC \d{4}/) // Addresses
    )) {
      inSignature = true;
    }
    
    if (!inSignature && line.length > 0) {
      cleanedLines.push(lines[i]);
    }
  }
  
  requestContent = cleanedLines.join('\n').trim();
  
  // Remove excessive whitespace and newlines
  requestContent = requestContent
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .replace(/[ \t]+/g, ' ') // Multiple spaces to single space
    .trim();
  
  return requestContent || cleaned.trim(); // Fallback to original if cleaning removed everything
}

async function handleNewRequest(supabase: any, emailData: Partial<IncomingEmail>, attachments: File[] = []): Promise<Response> {
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[handle-incoming-email] LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const senderEmail = emailData.sender?.toLowerCase() || '';
    const subject = emailData.subject || 'No subject';
    const rawContent = emailData['stripped-text'] || emailData['body-plain'] || '';
    const content = cleanEmailContent(rawContent);

    console.log('[handle-incoming-email] Analyzing email content with AI');

    // Fetch available form templates
    const { data: formTemplates } = await supabase
      .from('form_templates')
      .select('id, name, description, form_type')
      .eq('is_active', true);

    // Fetch departments
    const { data: departments } = await supabase
      .from('departments')
      .select('id, name, description')
      .eq('is_active', true);

    // Fetch request types with their categories
    const { data: requestTypes } = await supabase
      .from('request_types')
      .select(`
        id,
        name,
        description,
        department_id,
        request_categories (
          id,
          name,
          slug,
          description
        )
      `)
      .eq('is_active', true)
      .eq('request_categories.is_active', true);

    if (!formTemplates || formTemplates.length === 0) {
      throw new Error('No active form templates found');
    }

    // Build context for AI with full taxonomy
    const templatesList = formTemplates.map((t: any) => 
      `- ${t.name}: ${t.description || 'No description'}`
    ).join('\n');

    const departmentsList = departments?.map((d: any) => 
      `- ${d.name}: ${d.description || 'No description'}`
    ).join('\n') || '';

    // Build hierarchical request type and category structure
    const requestTypesStructure = requestTypes?.map((rt: any) => {
      const categories = rt.request_categories?.map((cat: any) => 
        `    • ${cat.name}: ${cat.description || 'No description'}`
      ).join('\n') || '    (no categories)';
      
      return `  ${rt.name}:\n    Description: ${rt.description || 'No description'}\n    Categories:\n${categories}`;
    }).join('\n\n') || '';

    console.log('[handle-incoming-email] Request Types Structure:', requestTypesStructure);

    // Call Lovable AI to analyze the email
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that categorizes support requests. Analyze the email and return a JSON object with the following fields:
- template_name: The best matching form template name from the list
- request_type_name: The best matching request type from the taxonomy below
- category_name: The best matching category under the request type
- priority: One of "low", "medium", "high", "urgent" based on urgency indicators in the email
- title: A concise summary of the request (max 100 characters)
- extracted_info: Key information extracted from the email

IMPORTANT: Match the request_type_name and category_name as precisely as possible to the taxonomy below.

Available form templates:
${templatesList}

Available departments:
${departmentsList}

Request Types and Categories Taxonomy:
${requestTypesStructure}

Priority Guidelines:
- "urgent": Immediate action required, system down, critical business impact
- "high": Important issue, significant impact, needs quick resolution
- "medium": Standard request, moderate importance
- "low": Non-urgent, minor issue, informational

Respond ONLY with valid JSON, no additional text.`
          },
          {
            role: 'user',
            content: `Subject: ${subject}\n\nBody:\n${content}`
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'categorize_request',
            description: 'Categorize the support request',
            parameters: {
              type: 'object',
              properties: {
                template_name: { type: 'string' },
                request_type_name: { type: 'string' },
                category_name: { type: 'string' },
                priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                title: { type: 'string' },
                extracted_info: { type: 'string' }
              },
              required: ['template_name', 'request_type_name', 'category_name', 'priority', 'title', 'extracted_info'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'categorize_request' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[handle-incoming-email] AI API error:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${errorText}`);
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('AI did not return categorization');
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    console.log('[handle-incoming-email] AI analysis:', analysis);

    // Find matching template
    const matchedTemplate = formTemplates.find((t: any) => 
      t.name.toLowerCase().includes(analysis.template_name.toLowerCase()) ||
      analysis.template_name.toLowerCase().includes(t.name.toLowerCase())
    );

    if (!matchedTemplate) {
      console.warn('[handle-incoming-email] No matching template found, using first available');
    }

    const selectedTemplate = matchedTemplate || formTemplates[0];

    // Find matching request type
    let matchedRequestType = null;
    let matchedCategory = null;

    if (requestTypes && analysis.request_type_name) {
      matchedRequestType = requestTypes.find((rt: any) => 
        rt.name.toLowerCase().includes(analysis.request_type_name.toLowerCase()) ||
        analysis.request_type_name.toLowerCase().includes(rt.name.toLowerCase())
      );

      // Find matching category within the request type
      if (matchedRequestType && analysis.category_name) {
        matchedCategory = matchedRequestType.request_categories?.find((cat: any) =>
          cat.name.toLowerCase().includes(analysis.category_name.toLowerCase()) ||
          analysis.category_name.toLowerCase().includes(cat.name.toLowerCase())
        );
      }
    }

    console.log('[handle-incoming-email] Matched Request Type:', matchedRequestType?.name || 'None');
    console.log('[handle-incoming-email] Matched Category:', matchedCategory?.name || 'None');

    // Find or create user profile
    let userProfile = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', senderEmail)
      .maybeSingle();

    let userId = userProfile.data?.id;

    // If user doesn't exist, we'll create a ticket with null user_id and store email in metadata
    if (!userId) {
      console.log('[handle-incoming-email] User not found in system, creating ticket with email reference');
    }

    // Create new ticket with matched request type and category
    const ticketData: any = {
      title: analysis.title || subject.substring(0, 100),
      description: content,
      priority: analysis.priority,
      status: 'open',
      user_id: userId || null,
      form_template_id: selectedTemplate.id,
      department_id: selectedTemplate.department_id,
      source: 'email',
      metadata: {
        sender_email: senderEmail,
        ai_analysis: analysis,
        original_subject: subject,
        original_body: rawContent, // Store original for audit
        email_message_id: emailData['Message-Id'],
        matched_request_type: matchedRequestType?.name || null,
        matched_category: matchedCategory?.name || null
      }
    };

    // Add request type and category IDs if found
    if (matchedRequestType) {
      ticketData.request_type_id = matchedRequestType.id;
    }
    if (matchedCategory) {
      ticketData.category_id = matchedCategory.id;
    }

    const { data: newTicket, error: ticketError } = await supabase
      .from('tickets')
      .insert(ticketData)
      .select()
      .single();

    if (ticketError) {
      console.error('[handle-incoming-email] Error creating ticket:', ticketError);
      throw ticketError;
    }

    console.log('[handle-incoming-email] Created new ticket:', newTicket.id, 'Request #:', newTicket.request_number);

    // Handle attachments for new request
    if (attachments.length > 0) {
      console.log('[handle-incoming-email] Processing', attachments.length, 'attachments for new ticket');
      
      for (const file of attachments) {
        try {
          const fileName = `${newTicket.id}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('request-attachments')
            .upload(fileName, file, {
              contentType: file.type,
              upsert: false,
            });

          if (uploadError) {
            console.error('[handle-incoming-email] Error uploading attachment:', uploadError);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from('request-attachments')
            .getPublicUrl(fileName);

          await supabase.from('request_attachments').insert({
            request_id: newTicket.id,
            request_type: 'ticket',
            file_name: file.name,
            file_path: fileName,
            file_url: urlData.publicUrl,
            file_size: file.size,
            content_type: file.type,
            uploaded_by: userId,
          });

          console.log('[handle-incoming-email] New ticket attachment saved:', file.name);
        } catch (error) {
          console.error('[handle-incoming-email] Error processing new ticket attachment:', error);
        }
      }
    }

    // Track email message
    await supabase.from('email_message_tracking').insert({
      request_id: newTicket.id,
      request_type: 'ticket',
      message_id: emailData['Message-Id'] || '',
      from_email: senderEmail,
      to_email: emailData.recipient || '',
      subject: subject,
      direction: 'inbound',
    });

    // Send detailed confirmation email to requester
    await supabase.functions.invoke('send-request-confirmation', {
      body: {
        ticketId: newTicket.id,
        recipientEmail: senderEmail,
      },
    });

    // Send notification to assigned team
    await supabase.functions.invoke('notify-ticket-event', {
      body: {
        requestId: newTicket.id,
        requestType: 'ticket',
        eventType: 'created',
        actorId: userId,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'New ticket created',
        ticket_id: newTicket.id,
        request_number: newTicket.request_number,
        analysis: analysis
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('[handle-incoming-email] Error in handleNewRequest:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[handle-incoming-email] Processing incoming email');

    // Parse form data from Mailgun
    const formData = await req.formData();
    const emailData: Partial<IncomingEmail> = {};
    const attachments: File[] = [];
    
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        emailData[key as keyof IncomingEmail] = value;
      } else if (value instanceof File) {
        // Collect email attachments
        attachments.push(value);
      }
    }
    
    console.log('[handle-incoming-email] Found', attachments.length, 'attachments');

    console.log('[handle-incoming-email] Email from:', emailData.sender);
    console.log('[handle-incoming-email] Subject:', emailData.subject);
    console.log('[handle-incoming-email] To:', emailData.recipient);
    console.log('[handle-incoming-email] Message-Id:', emailData['Message-Id']);

    // Check if this is a new request to requests@hub.visionradiology.com.au
    const isNewRequest = emailData.recipient?.toLowerCase().includes('requests@hub.visionradiology.com.au');
    
    if (isNewRequest) {
      console.log('[handle-incoming-email] Processing new request via email');
      return await handleNewRequest(supabase, emailData, attachments);
    }

    // Extract request number from multiple sources (To, Reply-To, Subject)
    let requestNumber: number | null = null;
    let requestId: string | null = null;
    let requestType: 'hardware' | 'ticket' | null = null;

    // Try To address first (reply+VRG-00001@domain.com)
    const toMatch = emailData.recipient?.match(/reply\+VRG-(\d{5})/i);
    if (toMatch) {
      requestNumber = parseInt(toMatch[1], 10);
      console.log('[handle-incoming-email] Found request number in To address:', requestNumber);
    }

    // Fallback to subject line
    if (!requestNumber) {
      const subjectMatch = emailData.subject?.match(/VRG-(\d{5})/i);
      if (subjectMatch) {
        requestNumber = parseInt(subjectMatch[1], 10);
        console.log('[handle-incoming-email] Found request number in subject:', requestNumber);
      }
    }

    if (requestNumber) {
      // Try hardware_requests first
      const { data: hardwareRequest } = await supabase
        .from('hardware_requests')
        .select('id, user_id, title, request_number, assigned_to, status')
        .eq('request_number', requestNumber)
        .maybeSingle();

      if (hardwareRequest) {
        requestId = hardwareRequest.id;
        requestType = 'hardware';
        console.log('[handle-incoming-email] Found hardware request:', hardwareRequest.id);
      } else {
        // Try tickets table (unified ticketing system)
        const { data: ticketRequest } = await supabase
          .from('tickets')
          .select('id, user_id, title, request_number, assigned_to, status')
          .eq('request_number', requestNumber)
          .maybeSingle();

        if (ticketRequest) {
          requestId = ticketRequest.id;
          requestType = 'ticket';
          console.log('[handle-incoming-email] Found ticket request:', ticketRequest.id);
        }
      }
    }

    if (!requestId || !requestType) {
      console.log('[handle-incoming-email] No matching request found');
      return new Response(
        JSON.stringify({ success: true, message: 'No matching request found' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Fetch the full request details
    const tableName = requestType === 'hardware' ? 'hardware_requests' : 'tickets';
    const { data: request, error: requestError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (!request) {
      throw new Error('Request not found after initial lookup');
    }

    const rawCommentContent = emailData['stripped-text'] || emailData['body-plain'] || '';
    const content = cleanEmailContent(rawCommentContent);
    const contentHtml = emailData['body-html'] || null;
    const senderEmail = emailData.sender?.toLowerCase() || '';

    // Check if sender is the assigned user
    let senderUserId: string | null = null;
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', senderEmail)
      .single();

    if (senderProfile) {
      senderUserId = senderProfile.id;
    }

    const isAssignedUser = senderUserId && request.assigned_to === senderUserId;
    const isRequester = senderUserId && request.user_id === senderUserId;

    console.log('[handle-incoming-email] Sender:', senderEmail, 'Is assigned:', isAssignedUser, 'Is requester:', isRequester);

    // Parse status keywords from email content
    const lowerContent = content.toLowerCase();
    let newStatus: string | null = null;

    const statusKeywords = [
      { keywords: ['approved', 'approve'], status: 'approved' },
      { keywords: ['declined', 'reject', 'deny'], status: 'declined' },
      { keywords: ['completed', 'done', 'resolved', 'close'], status: 'completed' },
      { keywords: ['on hold', 'waiting', 'hold'], status: 'on_hold' },
      { keywords: ['in progress', 'working', 'started'], status: 'in_progress' },
      { keywords: ['awaiting information', 'need info', 'need more info'], status: 'awaiting_information' },
    ];

    for (const { keywords, status } of statusKeywords) {
      if (keywords.some(kw => lowerContent.includes(kw))) {
        newStatus = status;
        console.log(`[handle-incoming-email] Detected status keyword: ${status}`);
        break;
      }
    }

    // Update status if keyword found and user is authorized
    if (newStatus && isAssignedUser && newStatus !== request.status) {
      console.log(`[handle-incoming-email] Updating status from ${request.status} to ${newStatus}`);
      
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ status: newStatus })
        .eq('id', requestId);

      if (updateError) {
        console.error('[handle-incoming-email] Error updating status:', updateError);
      } else {
        console.log('[handle-incoming-email] Status updated successfully');
      }
    } else if (newStatus && !isAssignedUser) {
      console.log('[handle-incoming-email] Status keyword found but user not authorized to change status');
    }

    // Add comment
    const { error: commentError } = await supabase
      .from('request_comments')
      .insert({
        request_id: requestId,
        user_id: senderUserId,
        author_name: emailData.sender || 'Unknown',
        author_email: senderEmail,
        content: content,
        content_html: contentHtml,
        is_internal: false,
        email_message_id: emailData['Message-Id'],
      });

    if (commentError) {
      console.error('[handle-incoming-email] Error creating comment:', commentError);
      throw commentError;
    }

    console.log('[handle-incoming-email] Comment added to request:', requestId);

    // Handle attachments from email
    if (attachments.length > 0) {
      console.log('[handle-incoming-email] Processing', attachments.length, 'attachments');
      
      for (const file of attachments) {
        try {
          // Upload to storage
          const fileName = `${requestId}/${Date.now()}-${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('request-attachments')
            .upload(fileName, file, {
              contentType: file.type,
              upsert: false,
            });

          if (uploadError) {
            console.error('[handle-incoming-email] Error uploading attachment:', uploadError);
            continue;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('request-attachments')
            .getPublicUrl(fileName);

          // Save attachment record
          const { error: attachmentError } = await supabase
            .from('request_attachments')
            .insert({
              request_id: requestId,
              request_type: requestType,
              file_name: file.name,
              file_path: fileName,
              file_url: urlData.publicUrl,
              file_size: file.size,
              content_type: file.type,
              uploaded_by: senderUserId,
            });

          if (attachmentError) {
            console.error('[handle-incoming-email] Error saving attachment record:', attachmentError);
          } else {
            console.log('[handle-incoming-email] Attachment saved:', file.name);
          }
        } catch (error) {
          console.error('[handle-incoming-email] Error processing attachment:', error);
        }
      }
    }

    // Track email message for threading
    await supabase.from('email_message_tracking').insert({
      request_id: requestId,
      request_type: requestType,
      message_id: emailData['Message-Id'] || '',
      in_reply_to: emailData['In-Reply-To'] || null,
      references: emailData['References'] || null,
      from_email: senderEmail,
      to_email: emailData.recipient || '',
      subject: emailData.subject || '',
      direction: 'inbound',
    });

    // Send notifications via notify-ticket-event
    if (newStatus) {
      await supabase.functions.invoke('notify-ticket-event', {
        body: {
          requestId,
          requestType,
          eventType: 'status_changed',
          actorId: senderUserId,
          oldValue: request.status,
          newValue: newStatus,
        },
      });
    }

    // Always send comment notification
    await supabase.functions.invoke('notify-ticket-event', {
      body: {
        requestId,
        requestType,
        eventType: 'commented',
        actorId: senderUserId,
        commentText: content.substring(0, 500),
      },
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Email processed' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('[handle-incoming-email] ERROR:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);
