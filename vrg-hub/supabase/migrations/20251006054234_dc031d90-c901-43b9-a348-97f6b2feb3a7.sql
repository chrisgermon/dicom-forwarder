-- Create notification trigger for new helpdesk tickets
CREATE OR REPLACE FUNCTION public.notify_new_helpdesk_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Notify department managers
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
    '/helpdesk?ticket=' || NEW.id
  FROM helpdesk_department_managers hdm
  WHERE hdm.department_id = NEW.department_id
    AND hdm.user_id != NEW.created_by;
  
  RETURN NEW;
END;
$$;

-- Create notification trigger for ticket status changes
CREATE OR REPLACE FUNCTION public.notify_helpdesk_ticket_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify ticket creator
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
      '/helpdesk?ticket=' || NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create notification trigger for ticket assignments
CREATE OR REPLACE FUNCTION public.notify_helpdesk_ticket_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    -- Notify assigned user
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
      '/helpdesk?ticket=' || NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create notification trigger for new comments
CREATE OR REPLACE FUNCTION public.notify_helpdesk_ticket_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  ticket_record RECORD;
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
      '/helpdesk?ticket=' || ticket_record.id
    );
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
      '/helpdesk?ticket=' || ticket_record.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach triggers to tables
DROP TRIGGER IF EXISTS helpdesk_ticket_created ON helpdesk_tickets;
CREATE TRIGGER helpdesk_ticket_created
  AFTER INSERT ON helpdesk_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_helpdesk_ticket();

DROP TRIGGER IF EXISTS helpdesk_ticket_status_changed ON helpdesk_tickets;
CREATE TRIGGER helpdesk_ticket_status_changed
  AFTER UPDATE ON helpdesk_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_helpdesk_ticket_status();

DROP TRIGGER IF EXISTS helpdesk_ticket_assigned ON helpdesk_tickets;
CREATE TRIGGER helpdesk_ticket_assigned
  AFTER UPDATE ON helpdesk_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_helpdesk_ticket_assignment();

DROP TRIGGER IF EXISTS helpdesk_ticket_comment_added ON helpdesk_ticket_comments;
CREATE TRIGGER helpdesk_ticket_comment_added
  AFTER INSERT ON helpdesk_ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_helpdesk_ticket_comment();