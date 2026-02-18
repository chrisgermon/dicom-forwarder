import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY');
const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface EmailRequest {
  template: string;
  to: string | string[];
  cc?: string | string[];
  data: Record<string, unknown>;
  replyTo?: string;
}

// Email template definitions
const APP_URL = 'https://hub.visionradiology.com.au';

const getEmailHeader = () => `
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #e5e7eb; margin-bottom: 30px;">
    <h1 style="margin: 0; color: #2563eb; font-size: 24px;">Vision Radiology</h1>
  </div>
`;

const getEmailFooter = (referenceId?: string) => `
  <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #666; font-size: 12px; text-align: center;">
    ${referenceId ? `<p><strong>Reference:</strong> ${referenceId}</p>` : ''}
    <p>© ${new Date().getFullYear()} Vision Radiology. All rights reserved.</p>
  </div>
`;

const wrapEmail = (content: string, referenceId?: string) => `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"></head>
  <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #ffffff; border-radius: 8px; padding: 30px;">
        ${getEmailHeader()}
        ${content}
        ${getEmailFooter(referenceId)}
      </div>
    </div>
  </body>
  </html>
`;

const emailButton = (text: string, href: string, color = '#2563eb') => `
  <a href="${href}" style="display: inline-block; background-color: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">${text}</a>
`;

const infoBox = (content: string, borderColor = '#2563eb', bgColor = '#eff6ff') => `
  <div style="background-color: ${bgColor}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${borderColor};">${content}</div>
`;

// Template generators
const templates: Record<string, (data: Record<string, unknown>) => { subject: string; html: string; text: string }> = {
  request_submitted: (data) => ({
    subject: `New Request: ${data.requestTitle}`,
    html: wrapEmail(`
      <h2 style="color: #2563eb;">New Request Submitted</h2>
      <p>Hello,</p>
      <p>A new request has been submitted:</p>
      ${infoBox(`
        <h3 style="margin-top: 0;">${data.requestTitle}</h3>
        <p><strong>Submitted by:</strong> ${data.requesterName}</p>
        ${data.totalAmount ? `<p><strong>Amount:</strong> ${data.currency || 'AUD'} ${data.totalAmount}</p>` : ''}
      `)}
      <div style="text-align: center; margin: 30px 0;">
        ${emailButton('View Request', `${APP_URL}/requests/${data.requestId}`)}
      </div>
    `, data.requestId as string),
    text: `New Request: ${data.requestTitle}\nSubmitted by: ${data.requesterName}\nView: ${APP_URL}/requests/${data.requestId}`,
  }),

  request_approved: (data) => ({
    subject: `✅ Request Approved: ${data.requestTitle}`,
    html: wrapEmail(`
      <h2 style="color: #16a34a;">Request Approved ✅</h2>
      <p>Hello ${data.requesterName},</p>
      <p>Your request has been approved!</p>
      ${infoBox(`
        <h3 style="margin-top: 0;">${data.requestTitle}</h3>
        <p><strong>Approved by:</strong> ${data.approverName}</p>
      `, '#16a34a', '#f0fdf4')}
      <div style="text-align: center; margin: 30px 0;">
        ${emailButton('View Details', `${APP_URL}/requests/${data.requestId}`, '#16a34a')}
      </div>
    `, data.requestId as string),
    text: `Request Approved: ${data.requestTitle}\nApproved by: ${data.approverName}`,
  }),

  request_declined: (data) => ({
    subject: `Request Declined: ${data.requestTitle}`,
    html: wrapEmail(`
      <h2 style="color: #dc2626;">Request Declined</h2>
      <p>Hello ${data.requesterName},</p>
      <p>Your request has been declined.</p>
      ${infoBox(`
        <h3 style="margin-top: 0;">${data.requestTitle}</h3>
        <p><strong>Declined by:</strong> ${data.approverName}</p>
        ${data.declineReason ? `<p><strong>Reason:</strong> ${data.declineReason}</p>` : ''}
      `, '#dc2626', '#fef2f2')}
      <div style="text-align: center; margin: 30px 0;">
        ${emailButton('View Details', `${APP_URL}/requests/${data.requestId}`, '#dc2626')}
      </div>
    `, data.requestId as string),
    text: `Request Declined: ${data.requestTitle}\nReason: ${data.declineReason || 'Not specified'}`,
  }),

  status_update: (data) => ({
    subject: `Status Update: ${data.requestTitle}`,
    html: wrapEmail(`
      <h2 style="color: #2563eb;">Status Update</h2>
      <p>Hello ${data.recipientName},</p>
      <p>There's an update on your request:</p>
      ${infoBox(`
        <h3 style="margin-top: 0;">${data.requestTitle}</h3>
        <p><strong>New Status:</strong> <span style="font-weight: bold;">${data.newStatus}</span></p>
        ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
      `)}
      <div style="text-align: center; margin: 30px 0;">
        ${emailButton('View Request', `${APP_URL}/requests/${data.requestId}`)}
      </div>
    `, data.requestId as string),
    text: `Status Update: ${data.requestTitle}\nNew Status: ${data.newStatus}`,
  }),

  new_comment: (data) => ({
    subject: `New Comment: ${data.requestTitle}`,
    html: wrapEmail(`
      <h2 style="color: #2563eb;">New Comment</h2>
      <p>Hello ${data.recipientName},</p>
      <p><strong>${data.commenterName}</strong> commented:</p>
      ${infoBox(`<p style="margin: 0; font-style: italic;">"${data.comment}"</p>`)}
      <div style="text-align: center; margin: 30px 0;">
        ${emailButton('View & Reply', `${APP_URL}/requests/${data.requestId}`)}
      </div>
    `, data.requestId as string),
    text: `New Comment on "${data.requestTitle}"\n${data.commenterName}: "${data.comment}"`,
  }),

  assignment: (data) => ({
    subject: `Assigned: ${data.requestTitle}`,
    html: wrapEmail(`
      <h2 style="color: #7c3aed;">Request Assigned to You</h2>
      <p>Hello ${data.assigneeName},</p>
      <p>You have been assigned to handle:</p>
      ${infoBox(`
        <h3 style="margin-top: 0;">${data.requestTitle}</h3>
        <p><strong>From:</strong> ${data.requesterName}</p>
        <p><strong>Priority:</strong> ${data.priority || 'Normal'}</p>
      `, '#7c3aed', '#f5f3ff')}
      <div style="text-align: center; margin: 30px 0;">
        ${emailButton('View Request', `${APP_URL}/requests/${data.requestId}`, '#7c3aed')}
      </div>
    `, data.requestId as string),
    text: `Request Assigned: ${data.requestTitle}\nFrom: ${data.requesterName}`,
  }),

  reminder: (data) => ({
    subject: `Reminder: ${data.title}`,
    html: wrapEmail(`
      <h2 style="color: #f59e0b;">⏰ Reminder</h2>
      <p>Hello ${data.recipientName},</p>
      ${infoBox(`
        <h3 style="margin-top: 0;">${data.title}</h3>
        ${data.description ? `<p>${data.description}</p>` : ''}
        ${data.dueDate ? `<p><strong>Due:</strong> ${data.dueDate}</p>` : ''}
      `, '#f59e0b', '#fffbeb')}
      ${data.actionUrl ? `<div style="text-align: center; margin: 30px 0;">${emailButton('Take Action', data.actionUrl as string, '#f59e0b')}</div>` : ''}
    `),
    text: `Reminder: ${data.title}\n${data.description || ''}`,
  }),

  welcome: (data) => ({
    subject: `Welcome to Vision Radiology Hub!`,
    html: wrapEmail(`
      <h2 style="color: #2563eb;">Welcome! 🎉</h2>
      <p>Hello ${data.userName},</p>
      <p>Your account has been created. Here's what you can do:</p>
      <div style="margin: 20px 0;">
        <p>📋 <strong>Submit Requests</strong> - Request hardware, software, and more</p>
        <p>📚 <strong>Knowledge Base</strong> - Access company documents</p>
        <p>🔔 <strong>Notifications</strong> - Stay updated in real-time</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        ${emailButton('Get Started', APP_URL)}
      </div>
    `),
    text: `Welcome to Vision Radiology Hub!\nHello ${data.userName}, visit ${APP_URL} to get started.`,
  }),
};

async function sendMailgunEmail(
  to: string[],
  subject: string,
  html: string,
  text: string,
  cc?: string[],
  replyTo?: string
): Promise<void> {
  const formData = new FormData();
  formData.append('from', `Vision Radiology Hub <noreply@${mailgunDomain}>`);
  to.forEach(email => formData.append('to', email));
  if (cc?.length) cc.forEach(email => formData.append('cc', email));
  formData.append('subject', subject);
  formData.append('html', html);
  formData.append('text', text);
  if (replyTo) formData.append('h:Reply-To', replyTo);

  const response = await fetch(
    `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`api:${mailgunApiKey}`)}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mailgun error: ${response.status} - ${errorText}`);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { template, to, cc, data, replyTo }: EmailRequest = await req.json();

    // Validate template
    const templateFn = templates[template];
    if (!templateFn) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${template}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate email content
    const { subject, html, text } = templateFn(data);

    // Normalize recipients
    const toList = Array.isArray(to) ? to : [to];
    const ccList = cc ? (Array.isArray(cc) ? cc : [cc]) : undefined;

    // Send email
    await sendMailgunEmail(toList, subject, html, text, ccList, replyTo);

    // Log email
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase.from('email_logs').insert({
      email_type: template,
      recipient_email: toList.join(', '),
      subject,
      status: 'sent',
      sent_at: new Date().toISOString(),
      metadata: { template, data, cc: ccList },
    });

    console.log(`[send-templated-email] Sent ${template} to ${toList.join(', ')}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[send-templated-email] Error:', error);

    // Log failed email
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const body = await req.clone().json();
      await supabase.from('email_logs').insert({
        email_type: body.template || 'unknown',
        recipient_email: Array.isArray(body.to) ? body.to.join(', ') : body.to,
        subject: 'Failed to generate',
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        metadata: body,
      });
    } catch (logError) {
      console.error('[send-templated-email] Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
