import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY');
const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN');

interface EmailRequest {
  to: string;
  cc?: string | string[];
  subject: string;
  template: string;
  data: any;
  requestId?: string;
  requestType?: 'hardware' | 'department';
  inReplyTo?: string;
  references?: string;
}

const generateApprovalToken = async (requestId: string, managerEmail: string): Promise<string> => {
  const secret = Deno.env.get('EMAIL_APPROVAL_SECRET') || 'fallback-secret';
  const data = `${requestId}:${managerEmail}:${secret}`;
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

const getEmailTemplate = (template: string, data: any): { html: string; text: string } => {
  const appUrl = 'https://hub.visionradiology.com.au';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://znpjdrmvjfmneotdhwdo.supabase.co';
  const logoCid = 'email-logo.png';
  
  // Common header with logo (use CID inline image for reliable rendering)
  const emailHeader = `
    <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #e5e7eb; margin-bottom: 30px;">
      <img src="cid:${logoCid}" alt="Vision Radiology" style="max-width: 200px; height: auto;" />
    </div>
  `;
  
  // Common footer with request ID
  const emailFooter = (requestId?: string, requestNumber?: string) => `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #666; font-size: 12px; text-align: center;">
      ${requestId || requestNumber ? `<p><strong>Reference:</strong> ${requestNumber || requestId}</p>` : ''}
      <p>© ${new Date().getFullYear()} Vision Radiology. All rights reserved.</p>
    </div>
  `;
  
  switch (template) {
    case 'request_submitted':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #2563eb;">New Hardware Request Submitted</h2>
            <p>Hello,</p>
            <p>A new hardware request has been submitted and requires your approval:</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Submitted by:</strong> ${data.requesterName}</p>
              ${data.totalAmount ? `<p><strong>Total Amount:</strong> ${data.currency || 'USD'} ${data.totalAmount}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p><strong>Quick Actions:</strong></p>
              <a href="${supabaseUrl}/functions/v1/approve-request-email?requestId=${data.requestId}&action=approve&managerEmail=${encodeURIComponent(data.managerEmail || '')}&token=${data.approvalToken}" 
                 style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 0 10px; display: inline-block;">
                ✅ Approve Request
              </a>
              <a href="${supabaseUrl}/functions/v1/approve-request-email?requestId=${data.requestId}&action=decline&managerEmail=${encodeURIComponent(data.managerEmail || '')}&token=${data.approvalToken}" 
                 style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 0 10px; display: inline-block;">
                ❌ Decline Request
              </a>
            </div>
            
            <p style="text-align: center; margin-top: 20px;">
              <a href="${appUrl}/requests/${data.requestId}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Full Details</a>
            </p>
            
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `New Hardware Request Submitted\n\nHello,\n\nA new hardware request has been submitted: ${data.requestTitle}\nSubmitted by: ${data.requesterName}\n\nTo approve: ${supabaseUrl}/functions/v1/approve-request-email?requestId=${data.requestId}&action=approve&managerEmail=${encodeURIComponent(data.managerEmail || '')}&token=${data.approvalToken}\n\nTo decline: ${supabaseUrl}/functions/v1/approve-request-email?requestId=${data.requestId}&action=decline&managerEmail=${encodeURIComponent(data.managerEmail || '')}&token=${data.approvalToken}\n\nReference: ${data.requestNumber || data.requestId}`
      };

    case 'request_approved':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #16a34a;">Request Approved ✅</h2>
            <p>Hello ${data.requesterName},</p>
            <p>Great news! Your hardware request has been approved:</p>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Approved by:</strong> ${data.managerName || data.adminName}</p>
              ${data.totalAmount ? `<p><strong>Total Amount:</strong> ${data.currency || 'USD'} ${data.totalAmount}</p>` : ''}
            </div>
            
            <p>Your request is now being processed and you'll receive updates on the delivery status.</p>
            <p><a href="${appUrl}/requests/${data.requestId}" style="background-color: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Request Details</a></p>
            
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `Request Approved\n\nHello ${data.requesterName},\n\nYour hardware request has been approved: ${data.requestTitle}\nApproved by: ${data.managerName || data.adminName}\n\nReference: ${data.requestNumber || data.requestId}`
      };

    case 'request_declined':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #dc2626;">Request Declined</h2>
            <p>Hello ${data.requesterName},</p>
            <p>Unfortunately, your hardware request has been declined:</p>
            
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Declined by:</strong> ${data.managerName || data.adminName}</p>
              ${data.declineReason ? `<p><strong>Reason:</strong> ${data.declineReason}</p>` : ''}
            </div>
            
            <p>If you have questions about this decision, please contact your manager or IT administrator.</p>
            <p><a href="${appUrl}/requests/${data.requestId}" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Request Details</a></p>
            
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `Request Declined\n\nHello ${data.requesterName},\n\nYour hardware request has been declined: ${data.requestTitle}\nReason: ${data.declineReason || 'Not specified'}\n\nReference: ${data.requestNumber || data.requestId}`
      };

    case 'request_ordered':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #2563eb;">Request Ordered 🚚</h2>
            <p>Hello ${data.requesterName},</p>
            <p>Your approved hardware request has been ordered:</p>
            
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <h3>${data.requestTitle}</h3>
              ${data.totalAmount ? `<p><strong>Total Amount:</strong> ${data.currency || 'USD'} ${data.totalAmount}</p>` : ''}
            </div>
            
            <p>You'll receive another notification once your items have been delivered.</p>
            <p><a href="${appUrl}/requests/${data.requestId}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Track Request Status</a></p>
            
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `Request Ordered\n\nHello ${data.requesterName},\n\nYour hardware request has been ordered: ${data.requestTitle}\n\nYou'll receive updates on delivery status.\n\nReference: ${data.requestNumber || data.requestId}`
      };

    case 'hardware_order_notification':
      const itemsList = data.items?.map((item: any) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.model_number || 'N/A'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.vendor || 'N/A'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.currency || 'AUD'} ${item.unit_price || 'N/A'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.currency || 'AUD'} ${item.total_price || 'N/A'}</td>
        </tr>
      `).join('') || '';

      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #16a34a;">New Hardware Order - Action Required 📦</h2>
            <p>A hardware request has been approved and is ready to order:</p>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Requested by:</strong> ${data.requesterName}</p>
              <p><strong>Approved by:</strong> ${data.managerName}</p>
              ${data.clinicName ? `<p><strong>Clinic:</strong> ${data.clinicName}</p>` : ''}
              <p><strong>Total Amount:</strong> ${data.currency || 'AUD'} ${data.totalAmount || '0.00'}</p>
            </div>

            ${data.businessJustification ? `
              <div style="margin: 20px 0;">
                <h4>Business Justification:</h4>
                <p style="background-color: #f8fafc; padding: 15px; border-radius: 4px;">${data.businessJustification}</p>
              </div>
            ` : ''}

            <h4>Items to Order:</h4>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Item</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Qty</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Model</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Vendor</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Unit Price</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList}
              </tbody>
            </table>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/confirm-order/${data.confirmToken}" style="background-color: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">Mark as Ordered</a>
            </div>

            <p style="text-align: center; margin-top: 15px;">
              <a href="${appUrl}/requests/${data.requestId}" style="color: #2563eb; text-decoration: none;">View Full Request Details</a>
            </p>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">Click "Mark as Ordered" to confirm the order and optionally add tracking details and delivery date. This will automatically notify the requester.</p>
            
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `New Hardware Order - Action Required\n\nRequest: ${data.requestTitle}\nRequested by: ${data.requesterName}\nApproved by: ${data.managerName}\nTotal Amount: ${data.currency || 'AUD'} ${data.totalAmount}\n\nMark as ordered: ${appUrl}/confirm-order/${data.confirmToken}\nView details: ${appUrl}/requests/${data.requestId}\n\nReference: ${data.requestNumber || data.requestId}`
      };

    case 'user_account_notification':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #2563eb;">New User Account Request 👤</h2>
            <p>A new user account request has been submitted and approved:</p>
            
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <h3>${data.firstName} ${data.lastName}</h3>
              <p><strong>Email:</strong> ${data.email}</p>
              ${data.department ? `<p><strong>Department:</strong> ${data.department}</p>` : ''}
              ${data.jobTitle ? `<p><strong>Job Title:</strong> ${data.jobTitle}</p>` : ''}
              ${data.startDate ? `<p><strong>Start Date:</strong> ${data.startDate}</p>` : ''}
              ${data.office365License ? `<p><strong>Office 365 License:</strong> ${data.office365License}</p>` : ''}
            </div>

            ${data.sharedMailboxes && data.sharedMailboxes.length > 0 ? `
              <div style="margin: 15px 0;">
                <h4>Shared Mailboxes:</h4>
                <ul style="background-color: #f8fafc; padding: 15px; border-radius: 4px;">
                  ${data.sharedMailboxes.map((mailbox: string) => `<li>${mailbox}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            ${data.roles && data.roles.length > 0 ? `
              <div style="margin: 15px 0;">
                <h4>Roles:</h4>
                <ul style="background-color: #f8fafc; padding: 15px; border-radius: 4px;">
                  ${data.roles.map((role: string) => `<li>${role}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            ${data.applications && data.applications.length > 0 ? `
              <div style="margin: 15px 0;">
                <h4>Application Access:</h4>
                <ul style="background-color: #f8fafc; padding: 15px; border-radius: 4px;">
                  ${data.applications.map((app: string) => `<li>${app}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            <div style="margin: 20px 0;">
              <p><strong>Requested by:</strong> ${data.requesterName}</p>
              ${data.managerName ? `<p><strong>Approved by:</strong> ${data.managerName}</p>` : ''}
            </div>

            <p style="text-align: center; margin-top: 30px;">
              <a href="${appUrl}/admin" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View in Admin Panel</a>
            </p>
            
            <p>Please create this user account in Active Directory and grant the necessary permissions.</p>
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `New User Account Request\n\nName: ${data.firstName} ${data.lastName}\nEmail: ${data.email}\nDepartment: ${data.department || 'N/A'}\nJob Title: ${data.jobTitle || 'N/A'}\n\nRequested by: ${data.requesterName}\n\nView in admin panel: ${appUrl}/admin\n\nReference: ${data.requestNumber || data.requestId}`
      };

    case 'welcome_email':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #2563eb;">Welcome to Vision Radiology Hub! 🎉</h2>
            <p>Hello ${data.userName},</p>
            <p>Welcome to Vision Radiology's internal hub! We're excited to have you on board.</p>
            
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <h3>Getting Started</h3>
              <p>Here's what you can do with the hub:</p>
            </div>

            <div style="margin: 20px 0;">
              <h4 style="color: #2563eb;">📋 Submit Requests</h4>
              <p style="margin-left: 20px;">Request hardware, software, marketing materials, and more. Track your requests in real-time and receive email updates on their status.</p>
              
              <h4 style="color: #2563eb; margin-top: 20px;">📧 Marketing Campaigns</h4>
              <p style="margin-left: 20px;">Create and manage email and fax campaigns. Use our drag-and-drop editor to design professional newsletters and announcements.</p>
              
              <h4 style="color: #2563eb; margin-top: 20px;">📚 Knowledge Base</h4>
              <p style="margin-left: 20px;">Access company documents, policies, and training materials all in one place.</p>
              
              <h4 style="color: #2563eb; margin-top: 20px;">🔔 Real-time Notifications</h4>
              <p style="margin-left: 20px;">Stay updated with instant notifications for request updates, approvals, and important announcements.</p>
              
              <h4 style="color: #2563eb; margin-top: 20px;">👥 Collaboration</h4>
              <p style="margin-left: 20px;">Work together with your team using comments, assignments, and shared workflows.</p>
            </div>

            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <h4>Need Help?</h4>
              <p>If you have any questions or need assistance, please don't hesitate to reach out to the IT team or your manager.</p>
            </div>
            
            <p style="text-align: center; margin-top: 30px;">
              <a href="${appUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Access the Hub</a>
            </p>
            
            ${emailFooter()}
          </div>
        `,
        text: `Welcome to Vision Radiology Hub!\n\nHello ${data.userName},\n\nWelcome to Vision Radiology's internal hub!\n\nKey Features:\n- Submit Requests: Hardware, software, marketing materials\n- Marketing Campaigns: Email and fax campaigns\n- Knowledge Base: Company documents and policies\n- Real-time Notifications: Stay updated on everything\n- Collaboration: Work together with your team\n\nAccess the hub: ${appUrl}\n\nNeed help? Contact IT or your manager.`
      };

    case 'marketing_request_submitted':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #2563eb;">New Marketing Request Submitted 📧</h2>
            <p>Hello,</p>
            <p>A new marketing request has been submitted and requires your approval:</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Request Type:</strong> ${data.requestType?.replace('_', ' ').toUpperCase()}</p>
              <p><strong>Submitted by:</strong> ${data.requesterName}</p>
              <p><strong>Priority:</strong> <span style="color: ${data.priority === 'urgent' ? '#dc2626' : data.priority === 'high' ? '#ea580c' : data.priority === 'medium' ? '#2563eb' : '#64748b'};">${data.priority?.toUpperCase()}</span></p>
              ${data.brand ? `<p><strong>Brand:</strong> ${data.brand}</p>` : ''}
              ${data.clinic ? `<p><strong>Clinic:</strong> ${data.clinic}</p>` : ''}
              ${data.scheduledSendDate ? `<p><strong>Scheduled for:</strong> ${data.scheduledSendDate}</p>` : ''}
            </div>

            ${data.description ? `
              <div style="margin: 20px 0;">
                <h4>Description:</h4>
                <p style="background-color: #f8fafc; padding: 15px; border-radius: 4px;">${data.description}</p>
              </div>
            ` : ''}
            
            <p style="text-align: center; margin-top: 20px;">
              <a href="${appUrl}/requests" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Request Details</a>
            </p>
            
            <p>Please review and approve/decline this request at your earliest convenience.</p>
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `New Marketing Request Submitted\n\nTitle: ${data.requestTitle}\nType: ${data.requestType}\nSubmitted by: ${data.requesterName}\nPriority: ${data.priority}\n\nView details: ${appUrl}/requests\n\nReference: ${data.requestNumber || data.requestId}`
      };

    case 'marketing_request_approved':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #16a34a;">Marketing Request Approved ✅</h2>
            <p>Hello ${data.requesterName},</p>
            <p>Great news! Your marketing request has been approved:</p>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Request Type:</strong> ${data.requestType?.replace('_', ' ').toUpperCase()}</p>
              <p><strong>Approved by:</strong> ${data.managerName || data.adminName}</p>
              ${data.brand ? `<p><strong>Brand:</strong> ${data.brand}</p>` : ''}
              ${data.clinic ? `<p><strong>Clinic:</strong> ${data.clinic}</p>` : ''}
            </div>
            
            <p>Your request is now being processed by the marketing team.</p>
            <p><a href="${appUrl}/requests" style="background-color: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Request Status</a></p>
            
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `Marketing Request Approved\n\nHello ${data.requesterName},\n\nYour marketing request has been approved: ${data.requestTitle}\nApproved by: ${data.managerName || data.adminName}\n\nView details: ${appUrl}/requests\n\nReference: ${data.requestNumber || data.requestId}`
      };

    case 'marketing_request_declined':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #dc2626;">Marketing Request Declined</h2>
            <p>Hello ${data.requesterName},</p>
            <p>Unfortunately, your marketing request has been declined:</p>
            
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Request Type:</strong> ${data.requestType?.replace('_', ' ').toUpperCase()}</p>
              <p><strong>Declined by:</strong> ${data.managerName || data.adminName}</p>
              ${data.declineReason ? `<p><strong>Reason:</strong> ${data.declineReason}</p>` : ''}
            </div>
            
            <p>If you have questions about this decision, please contact your manager or marketing team.</p>
            <p><a href="${appUrl}/requests" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Request Details</a></p>
            
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `Marketing Request Declined\n\nHello ${data.requesterName},\n\nYour marketing request has been declined: ${data.requestTitle}\nReason: ${data.declineReason || 'Not specified'}\n\nView details: ${appUrl}/requests\n\nReference: ${data.requestNumber || data.requestId}`
      };

    case 'department_request_submitted':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #2563eb;">New ${data.department || 'Department'} Request Submitted</h2>
            <p>Hello ${data.assigneeName || data.managerName || ''},</p>
            <p>A new ${data.department?.toLowerCase() || 'department'} request has been submitted ${data.assigneeName ? 'and assigned to you' : 'that requires attention'}:</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Submitted by:</strong> ${data.requesterName}</p>
              ${data.subDepartment ? `<p><strong>Request Type:</strong> ${data.subDepartment}</p>` : ''}
              ${data.priority ? `<p><strong>Priority:</strong> <span style="text-transform: uppercase; font-weight: bold; color: ${data.priority === 'urgent' ? '#dc2626' : data.priority === 'high' ? '#f59e0b' : '#6b7280'};">${data.priority}</span></p>` : ''}
              ${data.description ? `<p><strong>Description:</strong><br/>${data.description.substring(0, 200)}${data.description.length > 200 ? '...' : ''}</p>` : ''}
            </div>
            
            <p style="text-align: center; margin-top: 20px;">
              <a href="${data.requestUrl || appUrl + '/requests'}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Full Details</a>
            </p>
            
            <p>Please review and respond to this request at your earliest convenience.</p>
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `New ${data.department || 'Department'} Request Submitted\n\nHello ${data.assigneeName || data.managerName || ''},\n\nA new request has been submitted:\n\nTitle: ${data.requestTitle}\nSubmitted by: ${data.requesterName}${data.subDepartment ? `\nRequest Type: ${data.subDepartment}` : ''}${data.priority ? `\nPriority: ${data.priority}` : ''}\n\nView details: ${data.requestUrl || appUrl + '/requests'}\n\nReference: ${data.requestNumber || data.requestId}`
      };

    case 'request_comment_reply':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #2563eb;">New Update on Your Request 💬</h2>
            <p>Hello ${data.requesterName},</p>
            <p>There's a new update on your request from ${data.commenterName}:</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>${data.requestTitle}</h3>
              <p style="color: #666; font-size: 14px; margin-bottom: 10px;"><strong>From:</strong> ${data.commenterName}</p>
              <div style="background-color: #ffffff; padding: 15px; border-left: 3px solid #2563eb; border-radius: 4px;">
                <p style="margin: 0; white-space: pre-wrap;">${data.commentText}</p>
              </div>
            </div>
            
            <p style="text-align: center; margin-top: 30px;">
              <a href="${data.requestUrl || appUrl + '/requests?request=' + data.requestId}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Request & Reply</a>
            </p>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">You can view the full request details and respond by clicking the button above.</p>
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `New Update on Your Request\n\nHello ${data.requesterName},\n\nThere's a new update on your request: ${data.requestTitle}\n\nFrom: ${data.commenterName}\nMessage:\n${data.commentText}\n\nView and reply: ${data.requestUrl || appUrl + '/requests?request=' + data.requestId}\n\nReference: ${data.requestNumber || data.requestId}`
      };

    case 'request_created':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #2563eb;">New Request Created 📝</h2>
            <p>Hello,</p>
            <p>A new request has been created and may require your attention:</p>
            
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Submitted by:</strong> ${data.requesterName}</p>
              <p><strong>Request Number:</strong> ${data.requestNumber}</p>
            </div>
            
            <p style="text-align: center; margin-top: 30px;">
              <a href="${data.requestUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">View Request</a>
            </p>
            
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `New Request Created\n\nHello,\n\nA new request has been created:\n\nTitle: ${data.requestTitle}\nSubmitted by: ${data.requesterName}\nRequest Number: ${data.requestNumber}\n\nView details: ${data.requestUrl}\n\nReference: ${data.requestNumber}`
      };

    case 'request_assigned':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #2563eb;">Request Assigned to You 📋</h2>
            <p>Hello,</p>
            <p>A request has been assigned to you:</p>
            
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Submitted by:</strong> ${data.requesterName}</p>
              <p><strong>Request Number:</strong> ${data.requestNumber}</p>
              <p><strong>Assigned by:</strong> ${data.actorName}</p>
            </div>
            
            <p style="text-align: center; margin-top: 30px;">
              <a href="${data.requestUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">View Request</a>
            </p>
            
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `Request Assigned to You\n\nHello,\n\nA request has been assigned to you:\n\nTitle: ${data.requestTitle}\nSubmitted by: ${data.requesterName}\nRequest Number: ${data.requestNumber}\nAssigned by: ${data.actorName}\n\nView details: ${data.requestUrl}\n\nReference: ${data.requestNumber}`
      };

    case 'request_reassigned':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #2563eb;">Request Reassigned 🔄</h2>
            <p>Hello,</p>
            <p>A request has been reassigned:</p>
            
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Submitted by:</strong> ${data.requesterName}</p>
              <p><strong>Request Number:</strong> ${data.requestNumber}</p>
              <p><strong>Reassigned by:</strong> ${data.actorName}</p>
              ${data.oldAssignee ? `<p><strong>Previous Assignee:</strong> ${data.oldAssignee}</p>` : ''}
              ${data.newAssignee ? `<p><strong>New Assignee:</strong> ${data.newAssignee}</p>` : ''}
            </div>
            
            <p style="text-align: center; margin-top: 30px;">
              <a href="${data.requestUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">View Request</a>
            </p>
            
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `Request Reassigned\n\nHello,\n\nA request has been reassigned:\n\nTitle: ${data.requestTitle}\nSubmitted by: ${data.requesterName}\nRequest Number: ${data.requestNumber}\nReassigned by: ${data.actorName}${data.oldAssignee ? `\nPrevious Assignee: ${data.oldAssignee}` : ''}${data.newAssignee ? `\nNew Assignee: ${data.newAssignee}` : ''}\n\nView details: ${data.requestUrl}\n\nReference: ${data.requestNumber}`
      };

    case 'request_status_changed':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #2563eb;">Request Status Updated 📊</h2>
            <p>Hello,</p>
            <p>The status of a request has been updated:</p>
            
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Submitted by:</strong> ${data.requesterName}</p>
              <p><strong>Request Number:</strong> ${data.requestNumber}</p>
              <p><strong>Updated by:</strong> ${data.actorName}</p>
              ${data.oldStatus ? `<p><strong>Previous Status:</strong> <span style="text-transform: uppercase;">${data.oldStatus}</span></p>` : ''}
              ${data.newStatus ? `<p><strong>New Status:</strong> <span style="text-transform: uppercase; color: #16a34a; font-weight: bold;">${data.newStatus}</span></p>` : ''}
            </div>
            
            <p style="text-align: center; margin-top: 30px;">
              <a href="${data.requestUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">View Request</a>
            </p>
            
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `Request Status Updated\n\nHello,\n\nThe status of a request has been updated:\n\nTitle: ${data.requestTitle}\nSubmitted by: ${data.requesterName}\nRequest Number: ${data.requestNumber}\nUpdated by: ${data.actorName}${data.oldStatus ? `\nPrevious Status: ${data.oldStatus}` : ''}${data.newStatus ? `\nNew Status: ${data.newStatus}` : ''}\n\nView details: ${data.requestUrl}\n\nReference: ${data.requestNumber}`
      };

    case 'request_comment_added':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #2563eb;">New Comment Added 💬</h2>
            <p>Hello,</p>
            <p>A new comment has been added to a request:</p>
            
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Submitted by:</strong> ${data.requesterName}</p>
              <p><strong>Request Number:</strong> ${data.requestNumber}</p>
              <p><strong>Commented by:</strong> ${data.actorName}</p>
            </div>
            
            ${data.commentText ? `
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; white-space: pre-wrap;">${data.commentText}</p>
              </div>
            ` : ''}
            
            <p style="text-align: center; margin-top: 30px;">
              <a href="${data.requestUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">View Request & Reply</a>
            </p>
            
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `New Comment Added\n\nHello,\n\nA new comment has been added to a request:\n\nTitle: ${data.requestTitle}\nSubmitted by: ${data.requesterName}\nRequest Number: ${data.requestNumber}\nCommented by: ${data.actorName}${data.commentText ? `\n\nComment:\n${data.commentText}` : ''}\n\nView details: ${data.requestUrl}\n\nReference: ${data.requestNumber}`
      };

    case 'request_resolved':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #16a34a;">Request Completed ✅</h2>
            <p>Hello,</p>
            <p>A request has been marked as completed:</p>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Submitted by:</strong> ${data.requesterName}</p>
              <p><strong>Request Number:</strong> ${data.requestNumber}</p>
              <p><strong>Completed by:</strong> ${data.actorName}</p>
            </div>
            
            <p style="text-align: center; margin-top: 30px;">
              <a href="${data.requestUrl}" style="background-color: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">View Request</a>
            </p>
            
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `Request Completed\n\nHello,\n\nA request has been marked as completed:\n\nTitle: ${data.requestTitle}\nSubmitted by: ${data.requesterName}\nRequest Number: ${data.requestNumber}\nCompleted by: ${data.actorName}\n\nView details: ${data.requestUrl}\n\nReference: ${data.requestNumber}`
      };

    case 'request_escalated':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #dc2626;">⚠️ Request Escalated ⚠️</h2>
            <p>Hello,</p>
            <p><strong>URGENT:</strong> A request has been escalated and requires immediate attention:</p>
            
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Submitted by:</strong> ${data.requesterName}</p>
              <p><strong>Request Number:</strong> ${data.requestNumber}</p>
              <p><strong>Escalated by:</strong> ${data.actorName}</p>
            </div>
            
            <p style="text-align: center; margin-top: 30px;">
              <a href="${data.requestUrl}" style="background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">View Request Now</a>
            </p>
            
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `⚠️ REQUEST ESCALATED ⚠️\n\nHello,\n\nURGENT: A request has been escalated and requires immediate attention:\n\nTitle: ${data.requestTitle}\nSubmitted by: ${data.requesterName}\nRequest Number: ${data.requestNumber}\nEscalated by: ${data.actorName}\n\nView details: ${data.requestUrl}\n\nReference: ${data.requestNumber}`
      };

    default:
      throw new Error(`Unknown email template: ${template}`);
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, cc, subject, template, data, requestId, requestType, inReplyTo, references }: EmailRequest = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log(`[send-notification-email] Sending ${template} to ${to}`, cc ? `with CC: ${cc}` : '');

    const { html, text } = getEmailTemplate(template, data);

    // Generate Message-ID for threading
    const ticketDomain = 'hub.visionradiology.com.au';
    const messageId = `<${crypto.randomUUID()}@${ticketDomain}>`;
    
    // Generate Reply-To address with request number if available
    let replyToAddress = `noreply@${ticketDomain}`;
    if (data.requestNumber) {
      // Extract just the number (e.g., VRG-00001 -> 00001)
      const requestNum = data.requestNumber.replace('VRG-', '');
      replyToAddress = `reply+VRG-${requestNum}@${ticketDomain}`;
    }

    // Send email using Mailgun
    if (mailgunApiKey && mailgunDomain) {
      const formData = new FormData();
      formData.append('from', `VisionRadiology Hub <noreply@${ticketDomain}>`);
      formData.append('to', to);
      
      // Add CC recipients if provided
      if (cc) {
        const ccEmails = Array.isArray(cc) ? cc : [cc];
        ccEmails.forEach(email => {
          if (email && email.trim()) {
            formData.append('cc', email.trim());
          }
        });
      }
      
      formData.append('subject', subject);
      formData.append('html', html);
      formData.append('text', text);
      formData.append('h:Reply-To', replyToAddress);
      formData.append('h:Message-ID', messageId);

      // Attach inline logo image so it displays even when remote images are blocked
      try {
        // Try multiple logo sources in order of preference
        const logoUrls = [
          Deno.env.get('EMAIL_LOGO_URL'),
          'https://qnavtvxemndvrutnavvm.supabase.co/storage/v1/object/public/company-assets/VR22004_Logo_Update.png',
          'https://qnavtvxemndvrutnavvm.supabase.co/storage/v1/object/public/company-assets/vision-radiology-email-logo.png',
          'https://hub.visionradiology.com.au/vision-radiology-email-logo.png',
        ].filter(Boolean);
        
        let logoRes;
        let workingUrl;
        
        for (const url of logoUrls) {
          console.log('[send-notification-email] Trying logo URL:', url);
          logoRes = await fetch(url as string);
          if (logoRes.ok) {
            workingUrl = url;
            console.log('[send-notification-email] Logo fetched successfully from:', workingUrl);
            break;
          }
        }
        
        if (logoRes && logoRes.ok) {
          const logoBuffer = await logoRes.arrayBuffer();
          const contentType = logoRes.headers.get('content-type') || 'image/png';
          const logoBlob = new Blob([logoBuffer], { type: contentType });
          
          // Append inline attachment with filename matching the CID reference
          formData.append('inline', logoBlob, 'email-logo.png');
          console.log('[send-notification-email] Logo attached successfully');
        } else {
          console.warn('[send-notification-email] Failed to fetch logo from all URLs');
        }
      } catch (e) {
        console.warn('[send-notification-email] Error attaching inline logo:', e);
      }
      
      if (inReplyTo) {
        formData.append('h:In-Reply-To', inReplyTo);
      }
      
      if (references) {
        formData.append('h:References', references);
      } else if (inReplyTo) {
        formData.append('h:References', inReplyTo);
      }

      const mailgunResponse = await fetch(
        `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`api:${mailgunApiKey}`)}`,
          },
          body: formData,
        }
      );

      if (!mailgunResponse.ok) {
        const error = await mailgunResponse.text();
        throw new Error(`Mailgun error: ${error}`);
      }

      const mailgunResult = await mailgunResponse.json();
      console.log('[send-notification-email] Mailgun success:', mailgunResult);
      
      // Track email message for threading
      if (requestId && requestType) {
        await supabase.from('email_message_tracking').insert({
          request_id: requestId,
          request_type: requestType,
          message_id: messageId,
          in_reply_to: inReplyTo || null,
          references: references || inReplyTo || null,
          from_email: `noreply@${mailgunDomain}`,
          to_email: to,
          subject: subject,
          direction: 'outbound',
        });
      }

      // Log the email to email_logs table
      try {
        // Log primary recipient
        await supabase.from('email_logs').insert({
          recipient_email: to,
          sender_email: `noreply@${ticketDomain}`,
          subject: subject,
          email_type: template,
          status: 'sent',
          metadata: {
            template,
            request_id: requestId,
            request_type: requestType,
            message_id: messageId,
            ...data
          }
        });

        // Log CC recipients
        if (cc) {
          const ccEmails = Array.isArray(cc) ? cc : [cc];
          for (const ccEmail of ccEmails) {
            if (ccEmail && ccEmail.trim()) {
              await supabase.from('email_logs').insert({
                recipient_email: ccEmail.trim(),
                sender_email: `noreply@${ticketDomain}`,
                subject: subject,
                email_type: `${template}_cc`,
                status: 'sent',
                metadata: {
                  template,
                  request_id: requestId,
                  request_type: requestType,
                  message_id: messageId,
                  cc: true,
                  ...data
                }
              });
            }
          }
        }
      } catch (logError) {
        console.error('[send-notification-email] Failed to log email:', logError);
      }

      return new Response(
        JSON.stringify({ success: true, messageId }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else {
      throw new Error('Mailgun not configured');
    }
  } catch (error: any) {
    console.error("[send-notification-email] ERROR:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);
