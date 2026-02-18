-- Fix notification URLs and add email notifications for department managers

-- Drop existing triggers
DROP TRIGGER IF EXISTS helpdesk_ticket_created ON public.helpdesk_tickets;
DROP TRIGGER IF EXISTS helpdesk_ticket_status_changed ON public.helpdesk_tickets;
DROP TRIGGER IF EXISTS helpdesk_ticket_assigned ON public.helpdesk_tickets;
DROP TRIGGER IF EXISTS helpdesk_ticket_comment_added ON public.helpdesk_ticket_comments;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.notify_new_helpdesk_ticket();
DROP FUNCTION IF EXISTS public.notify_helpdesk_ticket_status();
DROP FUNCTION IF EXISTS public.notify_helpdesk_ticket_assignment();
DROP FUNCTION IF EXISTS public.notify_helpdesk_ticket_comment();

-- Create improved notify_new_helpdesk_ticket function with email notifications
CREATE OR REPLACE FUNCTION public.notify_new_helpdesk_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  manager_record RECORD;
BEGIN
  -- Create in-app notifications for department managers
  INSERT INTO public.notifications (
    user_id,
    company_id,
    type,
    title,
    message,
    reference_id,
    reference_url
  )
  SELECT DISTINCT
    hdm.user_id,
    NEW.company_id,
    'helpdesk_ticket',
    'New Support Ticket',
    'New ticket #' || NEW.ticket_number || ': ' || NEW.subject,
    NEW.id,
    '/helpdesk/ticket/' || NEW.id
  FROM helpdesk_department_managers hdm
  WHERE hdm.department_id = NEW.department_id
    AND hdm.user_id != NEW.created_by;
  
  -- Send email notifications to department managers
  FOR manager_record IN 
    SELECT DISTINCT
      p.email,
      p.name,
      hdm.user_id
    FROM helpdesk_department_managers hdm
    JOIN profiles p ON p.user_id = hdm.user_id
    WHERE hdm.department_id = NEW.department_id
      AND hdm.user_id != NEW.created_by
      AND p.email IS NOT NULL
  LOOP
    -- Invoke email edge function
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-ticket-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'ticketId', NEW.id,
        'eventType', 'ticket_created',
        'recipientEmail', manager_record.email,
        'recipientName', manager_record.name,
        'ticketNumber', NEW.ticket_number,
        'ticketSubject', NEW.subject
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create improved notify_helpdesk_ticket_status function
CREATE OR REPLACE FUNCTION public.notify_helpdesk_ticket_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_email TEXT;
  creator_name TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Create in-app notification
    INSERT INTO public.notifications (
      user_id,
      company_id,
      type,
      title,
      message,
      reference_id,
      reference_url
    ) VALUES (
      NEW.created_by,
      NEW.company_id,
      'helpdesk_ticket',
      'Ticket Status Updated',
      'Ticket #' || NEW.ticket_number || ' is now ' || NEW.status,
      NEW.id,
      '/helpdesk/ticket/' || NEW.id
    );
    
    -- Send email notification to ticket creator
    SELECT p.email, p.name INTO creator_email, creator_name
    FROM profiles p
    WHERE p.user_id = NEW.created_by;
    
    IF creator_email IS NOT NULL THEN
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-ticket-notification-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'ticketId', NEW.id,
          'eventType', 'ticket_status_changed',
          'recipientEmail', creator_email,
          'recipientName', creator_name,
          'ticketNumber', NEW.ticket_number,
          'ticketSubject', NEW.subject,
          'ticketStatus', NEW.status
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create improved notify_helpdesk_ticket_assignment function
CREATE OR REPLACE FUNCTION public.notify_helpdesk_ticket_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assignee_email TEXT;
  assignee_name TEXT;
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    -- Create in-app notification
    INSERT INTO public.notifications (
      user_id,
      company_id,
      type,
      title,
      message,
      reference_id,
      reference_url
    ) VALUES (
      NEW.assigned_to,
      NEW.company_id,
      'helpdesk_ticket',
      'Ticket Assigned to You',
      'You have been assigned ticket #' || NEW.ticket_number || ': ' || NEW.subject,
      NEW.id,
      '/helpdesk/ticket/' || NEW.id
    );
    
    -- Send email notification to assigned user
    SELECT p.email, p.name INTO assignee_email, assignee_name
    FROM profiles p
    WHERE p.user_id = NEW.assigned_to;
    
    IF assignee_email IS NOT NULL THEN
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-ticket-notification-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'ticketId', NEW.id,
          'eventType', 'ticket_assigned',
          'recipientEmail', assignee_email,
          'recipientName', assignee_name,
          'ticketNumber', NEW.ticket_number,
          'ticketSubject', NEW.subject
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create improved notify_helpdesk_ticket_comment function
CREATE OR REPLACE FUNCTION public.notify_helpdesk_ticket_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_record RECORD;
  creator_email TEXT;
  creator_name TEXT;
  assignee_email TEXT;
  assignee_name TEXT;
BEGIN
  -- Get ticket details
  SELECT * INTO ticket_record
  FROM helpdesk_tickets
  WHERE id = NEW.ticket_id;
  
  -- Don't notify internal comments to ticket creator if they're not staff
  IF NEW.is_internal AND NEW.user_id != ticket_record.created_by THEN
    RETURN NEW;
  END IF;
  
  -- Notify ticket creator (if not the commenter)
  IF ticket_record.created_by != NEW.user_id THEN
    INSERT INTO public.notifications (
      user_id,
      company_id,
      type,
      title,
      message,
      reference_id,
      reference_url
    ) VALUES (
      ticket_record.created_by,
      ticket_record.company_id,
      'helpdesk_ticket',
      'New Comment on Your Ticket',
      'New comment on ticket #' || ticket_record.ticket_number,
      ticket_record.id,
      '/helpdesk/ticket/' || ticket_record.id
    );
    
    -- Send email to creator
    SELECT p.email, p.name INTO creator_email, creator_name
    FROM profiles p
    WHERE p.user_id = ticket_record.created_by;
    
    IF creator_email IS NOT NULL THEN
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-ticket-notification-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'ticketId', ticket_record.id,
          'eventType', 'ticket_comment_added',
          'recipientEmail', creator_email,
          'recipientName', creator_name,
          'ticketNumber', ticket_record.ticket_number,
          'ticketSubject', ticket_record.subject,
          'commentText', LEFT(NEW.comment, 200)
        )
      );
    END IF;
  END IF;
  
  -- Notify assigned user (if exists and not the commenter)
  IF ticket_record.assigned_to IS NOT NULL AND ticket_record.assigned_to != NEW.user_id THEN
    INSERT INTO public.notifications (
      user_id,
      company_id,
      type,
      title,
      message,
      reference_id,
      reference_url
    ) VALUES (
      ticket_record.assigned_to,
      ticket_record.company_id,
      'helpdesk_ticket',
      'New Comment on Assigned Ticket',
      'New comment on ticket #' || ticket_record.ticket_number,
      ticket_record.id,
      '/helpdesk/ticket/' || ticket_record.id
    );
    
    -- Send email to assigned user
    SELECT p.email, p.name INTO assignee_email, assignee_name
    FROM profiles p
    WHERE p.user_id = ticket_record.assigned_to;
    
    IF assignee_email IS NOT NULL THEN
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-ticket-notification-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'ticketId', ticket_record.id,
          'eventType', 'ticket_comment_added',
          'recipientEmail', assignee_email,
          'recipientName', assignee_name,
          'ticketNumber', ticket_record.ticket_number,
          'ticketSubject', ticket_record.subject,
          'commentText', LEFT(NEW.comment, 200)
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER helpdesk_ticket_created
  AFTER INSERT ON public.helpdesk_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_helpdesk_ticket();

CREATE TRIGGER helpdesk_ticket_status_changed
  AFTER UPDATE ON public.helpdesk_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_helpdesk_ticket_status();

CREATE TRIGGER helpdesk_ticket_assigned
  AFTER UPDATE ON public.helpdesk_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_helpdesk_ticket_assignment();

CREATE TRIGGER helpdesk_ticket_comment_added
  AFTER INSERT ON public.helpdesk_ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_helpdesk_ticket_comment();