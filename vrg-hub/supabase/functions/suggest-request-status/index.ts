import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requestId, requestType } = await req.json();
    
    if (!requestId || !requestType) {
      return new Response(
        JSON.stringify({ error: 'Request ID and type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine the table based on request type
    const tableMap: Record<string, string> = {
      'hardware': 'hardware_requests',
      'marketing': 'marketing_requests',
      'user_account': 'user_account_requests',
      'toner': 'toner_requests',
      'department': 'department_requests',
    };

    const table = tableMap[requestType];
    if (!table) {
      return new Response(
        JSON.stringify({ error: 'Invalid request type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch request details
    const { data: request, error: requestError } = await supabase
      .from(table)
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      console.error('Error fetching request:', requestError);
      return new Response(
        JSON.stringify({ error: 'Request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch comments/activity
    const { data: comments } = await supabase
      .from('request_comments')
      .select('comment, created_at, user_id')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    // Fetch status history
    const { data: statusHistory } = await supabase
      .from('request_status_history')
      .select('status, created_at, notes')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    // Build context for AI
    const context = {
      currentStatus: request.status,
      title: request.title,
      description: request.description,
      priority: request.priority,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
      hasManager: !!request.manager_id,
      hasAdmin: !!request.admin_id,
      isAssigned: !!(request.assigned_to || request.manager_id || request.admin_id),
      managerApprovedAt: request.manager_approved_at,
      adminApprovedAt: request.admin_approved_at,
      declinedAt: request.declined_at,
      declineReason: request.decline_reason,
      commentsCount: comments?.length || 0,
      lastCommentAt: comments?.[0]?.created_at,
      statusChanges: statusHistory?.length || 0,
      lastStatusChange: statusHistory?.[0]?.status,
    };

    // Call AI to suggest status
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a request status analyzer. Based on request data and activity, suggest the most appropriate status.

Available statuses:
- draft: Not yet submitted
- submitted: Just submitted, awaiting review
- inbox: Received via email, needs categorization
- pending_manager_approval: Awaiting manager approval
- pending_admin_approval: Awaiting admin approval
- in_progress: Actively being worked on
- awaiting_information: Waiting for requester to provide info
- on_hold: Temporarily paused
- approved: Approved and ready to proceed
- ordered: Items/services have been ordered
- delivered: Items delivered or service completed
- completed: Request fully completed
- declined: Request rejected
- cancelled: Request cancelled by requester

Analyze the request context and suggest the most appropriate status with a brief reason.`
          },
          {
            role: 'user',
            content: `Analyze this request and suggest the best status:

Current Status: ${context.currentStatus}
Title: ${context.title}
Priority: ${context.priority || 'Not set'}
Created: ${new Date(context.createdAt).toLocaleDateString()}
Last Updated: ${new Date(context.updatedAt).toLocaleDateString()}
Assigned: ${context.isAssigned ? 'Yes' : 'No'}
Manager Approved: ${context.managerApprovedAt ? 'Yes' : 'No'}
Admin Approved: ${context.adminApprovedAt ? 'Yes' : 'No'}
Comments: ${context.commentsCount}
Recent Comment: ${context.lastCommentAt ? new Date(context.lastCommentAt).toLocaleDateString() : 'None'}
Status Changes: ${context.statusChanges}
${context.declinedAt ? `Declined: ${context.declineReason || 'No reason given'}` : ''}

Provide response as JSON: { "suggestedStatus": "status_name", "reason": "brief explanation" }`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      // Fallback to rule-based status
      let suggestedStatus = context.currentStatus;
      let reason = 'Using current status (AI unavailable)';
      
      if (context.declinedAt) {
        suggestedStatus = 'declined';
        reason = 'Request has been declined';
      } else if (context.adminApprovedAt && context.managerApprovedAt) {
        suggestedStatus = 'approved';
        reason = 'Both manager and admin have approved';
      } else if (context.commentsCount > 0 && !context.isAssigned) {
        suggestedStatus = 'awaiting_information';
        reason = 'Has comments but no assignee';
      } else if (context.isAssigned && context.currentStatus === 'submitted') {
        suggestedStatus = 'in_progress';
        reason = 'Assigned and should be in progress';
      }
      
      return new Response(
        JSON.stringify({ suggestedStatus, reason, isAIGenerated: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '{}';
    
    // Parse AI response
    let result;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiContent.match(/\{[^}]+\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, aiContent);
      result = {
        suggestedStatus: context.currentStatus,
        reason: 'Could not parse AI response'
      };
    }

    return new Response(
      JSON.stringify({ 
        ...result,
        isAIGenerated: true,
        currentStatus: context.currentStatus 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-request-status:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});