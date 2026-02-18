// Using Deno.serve instead of deprecated import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Checking for reminders to send...');

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get all active reminders (including past-due for repeat_until_complete)
    const { data: reminders, error: remindersError } = await supabase
      .from('reminders')
      .select('*')
      .eq('is_active', true)
      .eq('status', 'active');

    if (remindersError) {
      throw remindersError;
    }

    console.log(`Found ${reminders?.length || 0} active reminders`);

    let processedCount = 0;
    let sentCount = 0;

    for (const reminder of reminders || []) {
      const reminderDate = new Date(reminder.reminder_date);
      const daysUntil = Math.ceil((reminderDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`Reminder: ${reminder.title}, Days until: ${daysUntil}`);

      // Check if we should send a notification based on advance_notice_days
      const advanceNoticeDays = reminder.advance_notice_days || [7, 3, 1];
      
      // For overdue reminders: send daily notifications
      const isPastDue = daysUntil < 0;
      const shouldSendOverdueNotification = isPastDue; // Always send daily for overdue
      
      // Check if already sent today for overdue reminders
      if (shouldSendOverdueNotification) {
        const lastSent = reminder.last_notification_sent ? new Date(reminder.last_notification_sent) : null;
        if (lastSent) {
          const lastSentDate = new Date(lastSent.getFullYear(), lastSent.getMonth(), lastSent.getDate());
          if (lastSentDate.getTime() === today.getTime()) {
            console.log(`Already sent overdue notification today for reminder ${reminder.id}`);
            continue;
          }
        }
      } else if (!advanceNoticeDays.includes(daysUntil) && daysUntil !== 0) {
        continue; // Not a notification day
      }

      processedCount++;

      // Check if we already sent a notification for this day
      const { data: existingNotifications } = await supabase
        .from('reminder_notifications')
        .select('id')
        .eq('reminder_id', reminder.id)
        .eq('days_before', daysUntil)
        .eq('status', 'sent');

      if (existingNotifications && existingNotifications.length > 0) {
        console.log(`Already sent notification for reminder ${reminder.id} at ${daysUntil} days`);
        continue;
      }

      const channels = reminder.notification_channels as { email?: boolean; sms?: boolean; in_app?: boolean };
      
      // Fetch user profile if needed
      let userProfile: any = null;
      if (reminder.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, phone, full_name')
          .eq('id', reminder.user_id)
          .maybeSingle();
        userProfile = profile;
      }

      // Prepare message
      const daysMessage = daysUntil === 0 
        ? 'Today' 
        : daysUntil === 1 
        ? 'Tomorrow'
        : daysUntil < 0
        ? `${Math.abs(daysUntil)} days overdue`
        : `in ${daysUntil} days`;

      const overduePrefix = isPastDue ? '⚠️ OVERDUE: ' : '';
      const baseMessage = `${overduePrefix}Reminder: ${reminder.title}${reminder.description ? ' - ' + reminder.description : ''} is ${daysMessage}!`;
      const reminderLink = `https://hub.visionradiology.com.au/reminders/${reminder.id}`;
      // Include link only for SMS messages, email/in-app use baseMessage
      const smsMessage = `${baseMessage}\n\nMark complete: ${reminderLink}`;
      const message = baseMessage;

      // Send Email
      if (channels.email) {
        const emailTo = reminder.email || userProfile?.email;
        
        // Get all recipients: primary email + cc_emails
        const allRecipients: string[] = [];
        if (emailTo) allRecipients.push(emailTo);
        
        // Add CC emails if present
        const ccEmails = reminder.cc_emails as string[] | null;
        if (ccEmails && Array.isArray(ccEmails)) {
          for (const ccEmail of ccEmails) {
            if (ccEmail && !allRecipients.includes(ccEmail)) {
              allRecipients.push(ccEmail);
            }
          }
        }
        
        if (allRecipients.length > 0) {
          // Send to each recipient
          for (const recipientEmail of allRecipients) {
            try {
              console.log(`Sending email reminder to ${recipientEmail}`);
              
              const emailResponse = await supabase.functions.invoke('send-email-reminder', {
                body: {
                  reminderId: reminder.id,
                  email: recipientEmail,
                  subject: `Reminder: ${reminder.title} ${daysMessage}`,
                  message: message,
                  reminderTitle: reminder.title,
                  reminderDate: reminder.reminder_date,
                },
              });

              if (emailResponse.error) {
                console.error('Error sending email:', emailResponse.error);
                await supabase
                  .from('reminder_notifications')
                  .insert({
                    reminder_id: reminder.id,
                    notification_type: 'email',
                    status: 'failed',
                    days_before: daysUntil,
                    recipient: recipientEmail,
                    error_message: emailResponse.error.message || 'Unknown error',
                  });
              } else {
                console.log('Email sent successfully to:', recipientEmail);
                sentCount++;
              }
            } catch (error) {
              console.error('Error invoking email function:', error);
              await supabase
                .from('reminder_notifications')
                .insert({
                  reminder_id: reminder.id,
                  notification_type: 'email',
                  status: 'failed',
                  days_before: daysUntil,
                  recipient: recipientEmail,
                  error_message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
          }
        } else {
          console.log('No email address available for reminder:', reminder.id);
        }
      }

      // Send SMS
      if (channels.sms) {
        const phoneNumber = reminder.phone_number || userProfile?.phone;
        
        if (phoneNumber) {
          try {
            console.log(`Sending SMS reminder to ${phoneNumber}`);
            
            const smsResponse = await supabase.functions.invoke('send-sms-reminder', {
              body: {
                reminderId: reminder.id,
                phoneNumber: phoneNumber,
                message: smsMessage,
              },
            });

            if (smsResponse.error) {
              console.error('Error sending SMS:', smsResponse.error);
            } else {
              console.log('SMS sent successfully');
              sentCount++;
            }
          } catch (error) {
            console.error('Error invoking SMS function:', error);
          }
        } else {
          console.log('No phone number available for reminder:', reminder.id);
        }
      }

      // Create in-app notification
      if (channels.in_app) {
        try {
          // First, log to reminder_notifications for tracking
          await supabase
            .from('reminder_notifications')
            .insert({
              reminder_id: reminder.id,
              notification_type: 'in_app',
              status: 'sent',
              days_before: daysUntil,
              metadata: {
                message: message,
                reminder_title: reminder.title,
                reminder_date: reminder.reminder_date,
              }
            });

          // IMPORTANT: Also insert into the main notifications table so it shows in the UI
          if (reminder.user_id) {
            const notificationTitle = isPastDue
              ? `⚠️ Overdue Reminder: ${reminder.title}`
              : `Reminder: ${reminder.title}`;

            const { error: notifError } = await supabase
              .from('notifications')
              .insert({
                user_id: reminder.user_id,
                type: 'reminder',
                category: 'reminder',
                title: notificationTitle,
                message: message,
                reference_url: `/reminders/${reminder.id}`,
              });

            if (notifError) {
              console.error('Error inserting into notifications table:', notifError);
            } else {
              console.log('Created in-app notification in notifications table for reminder:', reminder.id);
            }
          } else {
            console.log('Skipping notifications table insert - missing user_id for reminder:', reminder.id);
          }

          console.log('Created in-app notification for reminder:', reminder.id);
          sentCount++;
        } catch (error) {
          console.error('Error creating in-app notification:', error);
        }
      }

      // Update last_notification_sent for overdue reminders (to prevent duplicate daily notifications)
      if (isPastDue) {
        await supabase
          .from('reminders')
          .update({ last_notification_sent: now.toISOString() })
          .eq('id', reminder.id);
      }

      // Mark reminder as completed if it's the actual date (only if NOT repeat_until_complete)
      if (daysUntil === 0 && !reminder.is_recurring && !reminder.repeat_until_complete) {
        await supabase
          .from('reminders')
          .update({ 
            status: 'completed',
            completed_at: now.toISOString(),
          })
          .eq('id', reminder.id);
      }

      // Handle recurring reminders
      if (daysUntil === 0 && reminder.is_recurring) {
        const nextDate = new Date(reminderDate);
        
        switch (reminder.recurrence_pattern) {
          case 'daily':
            nextDate.setDate(nextDate.getDate() + (reminder.recurrence_interval || 1));
            break;
          case 'weekly':
            nextDate.setDate(nextDate.getDate() + (7 * (reminder.recurrence_interval || 1)));
            break;
          case 'fortnightly':
            nextDate.setDate(nextDate.getDate() + (14 * (reminder.recurrence_interval || 1)));
            break;
          case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + (reminder.recurrence_interval || 1));
            break;
          case 'quarterly':
            nextDate.setMonth(nextDate.getMonth() + (3 * (reminder.recurrence_interval || 1)));
            break;
          case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + (reminder.recurrence_interval || 1));
            break;
        }

        await supabase
          .from('reminders')
          .update({ reminder_date: nextDate.toISOString() })
          .eq('id', reminder.id);

        console.log(`Updated recurring reminder ${reminder.id} to ${nextDate}`);
      }
    }

    console.log(`Processed ${processedCount} reminders, sent ${sentCount} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount,
        sent: sentCount,
        timestamp: now.toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in check-reminders:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

Deno.serve(handler);
