-- ============================================================================
-- FIX IN-APP NOTIFICATIONS
-- This migration adds triggers to create in-app notifications for the tickets
-- table and related tables, fixing the broken notification system.
-- ============================================================================

-- ============================================================================
-- PART 1: TICKETS TABLE TRIGGERS
-- ============================================================================

-- Function to notify when a new ticket is created
CREATE OR REPLACE FUNCTION public.notify_ticket_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_company_id UUID;
  request_type_name TEXT;
BEGIN
  -- Get requester's company_id from profiles
  SELECT company_id INTO requester_company_id
  FROM profiles
  WHERE id = NEW.requester_user_id;

  -- Get request type name
  SELECT name INTO request_type_name
  FROM request_types
  WHERE id = NEW.request_type_id;

  -- If we have a company_id, create notifications for watchers and assigned users
  IF requester_company_id IS NOT NULL THEN
    -- Notify assigned user if exists
    IF NEW.assigned_user_id IS NOT NULL AND NEW.assigned_user_id != NEW.requester_user_id THEN
      INSERT INTO public.notifications (
        user_id,
        company_id,
        type,
        title,
        message,
        reference_id,
        reference_url
      ) VALUES (
        NEW.assigned_user_id,
        requester_company_id,
        'ticket',
        'New Ticket Assigned',
        'You have been assigned to ticket ' || NEW.reference_code || ': ' || NEW.subject,
        NEW.id,
        '/request/' || NEW.reference_code
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to notify when ticket status changes
CREATE OR REPLACE FUNCTION public.notify_ticket_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_company_id UUID;
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get requester's company_id from profiles
  SELECT company_id INTO requester_company_id
  FROM profiles
  WHERE id = NEW.requester_user_id;

  IF requester_company_id IS NOT NULL THEN
    -- Notify the requester about status change
    INSERT INTO public.notifications (
      user_id,
      company_id,
      type,
      title,
      message,
      reference_id,
      reference_url
    ) VALUES (
      NEW.requester_user_id,
      requester_company_id,
      'ticket',
      'Ticket Status Updated',
      'Ticket ' || NEW.reference_code || ' is now ' || REPLACE(NEW.status, '_', ' '),
      NEW.id,
      '/request/' || NEW.reference_code
    );

    -- Also notify assigned user if different from requester
    IF NEW.assigned_user_id IS NOT NULL AND NEW.assigned_user_id != NEW.requester_user_id THEN
      INSERT INTO public.notifications (
        user_id,
        company_id,
        type,
        title,
        message,
        reference_id,
        reference_url
      ) VALUES (
        NEW.assigned_user_id,
        requester_company_id,
        'ticket',
        'Ticket Status Updated',
        'Ticket ' || NEW.reference_code || ' is now ' || REPLACE(NEW.status, '_', ' '),
        NEW.id,
        '/request/' || NEW.reference_code
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to notify when ticket is assigned/reassigned
CREATE OR REPLACE FUNCTION public.notify_ticket_assignment_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_company_id UUID;
BEGIN
  -- Only proceed if assignment actually changed
  IF OLD.assigned_user_id IS NOT DISTINCT FROM NEW.assigned_user_id THEN
    RETURN NEW;
  END IF;

  -- Get requester's company_id from profiles
  SELECT company_id INTO requester_company_id
  FROM profiles
  WHERE id = NEW.requester_user_id;

  IF requester_company_id IS NOT NULL AND NEW.assigned_user_id IS NOT NULL THEN
    -- Notify the newly assigned user
    INSERT INTO public.notifications (
      user_id,
      company_id,
      type,
      title,
      message,
      reference_id,
      reference_url
    ) VALUES (
      NEW.assigned_user_id,
      requester_company_id,
      'ticket',
      'Ticket Assigned to You',
      'You have been assigned to ticket ' || NEW.reference_code || ': ' || NEW.subject,
      NEW.id,
      '/request/' || NEW.reference_code
    );

    -- Notify the requester that their ticket was assigned
    IF NEW.requester_user_id IS NOT NULL AND NEW.requester_user_id != NEW.assigned_user_id THEN
      INSERT INTO public.notifications (
        user_id,
        company_id,
        type,
        title,
        message,
        reference_id,
        reference_url
      ) VALUES (
        NEW.requester_user_id,
        requester_company_id,
        'ticket',
        'Ticket Assigned',
        'Your ticket ' || NEW.reference_code || ' has been assigned',
        NEW.id,
        '/request/' || NEW.reference_code
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 2: TICKET COMMENTS TRIGGER
-- ============================================================================

-- Function to notify when a comment is added to a ticket
CREATE OR REPLACE FUNCTION public.notify_ticket_comment_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_record RECORD;
  requester_company_id UUID;
  commenter_name TEXT;
  watcher_record RECORD;
BEGIN
  -- Get ticket details
  SELECT * INTO ticket_record
  FROM tickets
  WHERE id = NEW.ticket_id;

  IF ticket_record IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get requester's company_id
  SELECT company_id INTO requester_company_id
  FROM profiles
  WHERE id = ticket_record.requester_user_id;

  -- Get commenter name
  SELECT COALESCE(full_name, email) INTO commenter_name
  FROM profiles
  WHERE id = NEW.author_user_id;

  IF requester_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Notify the ticket requester (if not the commenter)
  IF ticket_record.requester_user_id IS NOT NULL
     AND ticket_record.requester_user_id != NEW.author_user_id THEN
    INSERT INTO public.notifications (
      user_id,
      company_id,
      type,
      title,
      message,
      reference_id,
      reference_url
    ) VALUES (
      ticket_record.requester_user_id,
      requester_company_id,
      'ticket',
      'New Comment on Your Ticket',
      COALESCE(commenter_name, 'Someone') || ' commented on ticket ' || ticket_record.reference_code,
      ticket_record.id,
      '/request/' || ticket_record.reference_code
    );
  END IF;

  -- Notify the assigned user (if exists and not the commenter)
  IF ticket_record.assigned_user_id IS NOT NULL
     AND ticket_record.assigned_user_id != NEW.author_user_id
     AND ticket_record.assigned_user_id != ticket_record.requester_user_id THEN
    INSERT INTO public.notifications (
      user_id,
      company_id,
      type,
      title,
      message,
      reference_id,
      reference_url
    ) VALUES (
      ticket_record.assigned_user_id,
      requester_company_id,
      'ticket',
      'New Comment on Assigned Ticket',
      COALESCE(commenter_name, 'Someone') || ' commented on ticket ' || ticket_record.reference_code,
      ticket_record.id,
      '/request/' || ticket_record.reference_code
    );
  END IF;

  -- Notify all watchers (except the commenter)
  FOR watcher_record IN
    SELECT tw.user_id
    FROM ticket_watchers tw
    WHERE tw.ticket_id = NEW.ticket_id
      AND tw.user_id != NEW.author_user_id
      AND tw.user_id != ticket_record.requester_user_id
      AND tw.user_id != COALESCE(ticket_record.assigned_user_id, '00000000-0000-0000-0000-000000000000'::UUID)
  LOOP
    INSERT INTO public.notifications (
      user_id,
      company_id,
      type,
      title,
      message,
      reference_id,
      reference_url
    ) VALUES (
      watcher_record.user_id,
      requester_company_id,
      'ticket',
      'New Comment on Watched Ticket',
      COALESCE(commenter_name, 'Someone') || ' commented on ticket ' || ticket_record.reference_code,
      ticket_record.id,
      '/request/' || ticket_record.reference_code
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 3: REQUEST COMMENTS TRIGGER (for legacy request_comments table)
-- ============================================================================

-- Function to notify when a comment is added via request_comments table
CREATE OR REPLACE FUNCTION public.notify_request_comment_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_record RECORD;
  requester_company_id UUID;
  commenter_name TEXT;
BEGIN
  -- Try to find the ticket by request_id
  SELECT t.*, p.company_id as requester_company_id
  INTO ticket_record
  FROM tickets t
  LEFT JOIN profiles p ON p.id = t.requester_user_id
  WHERE t.id = NEW.request_id;

  -- If not in tickets table, try hardware_requests
  IF ticket_record IS NULL THEN
    SELECT hr.id, hr.user_id as requester_user_id, hr.title as subject,
           hr.company_id, hr.request_number,
           'VRG-' || LPAD(hr.request_number::TEXT, 5, '0') as reference_code
    INTO ticket_record
    FROM hardware_requests hr
    WHERE hr.id = NEW.request_id;
  END IF;

  IF ticket_record IS NULL OR ticket_record.requester_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get commenter name
  SELECT COALESCE(full_name, email) INTO commenter_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- Don't notify for internal notes
  IF NEW.is_internal = true THEN
    RETURN NEW;
  END IF;

  -- Notify the ticket requester (if not the commenter)
  IF ticket_record.requester_user_id IS NOT NULL
     AND ticket_record.requester_user_id != NEW.user_id THEN
    INSERT INTO public.notifications (
      user_id,
      company_id,
      type,
      title,
      message,
      reference_id,
      reference_url
    ) VALUES (
      ticket_record.requester_user_id,
      ticket_record.requester_company_id,
      'ticket',
      'New Comment on Your Request',
      COALESCE(commenter_name, 'Someone') || ' commented on your request',
      ticket_record.id,
      '/request/' || COALESCE(ticket_record.reference_code, ticket_record.id::TEXT)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 4: CREATE/REPLACE TRIGGERS
-- ============================================================================

-- Tickets table triggers
DROP TRIGGER IF EXISTS notify_ticket_created_trigger ON public.tickets;
CREATE TRIGGER notify_ticket_created_trigger
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_created();

DROP TRIGGER IF EXISTS notify_ticket_status_changed_trigger ON public.tickets;
CREATE TRIGGER notify_ticket_status_changed_trigger
  AFTER UPDATE OF status ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_status_changed();

DROP TRIGGER IF EXISTS notify_ticket_assignment_changed_trigger ON public.tickets;
CREATE TRIGGER notify_ticket_assignment_changed_trigger
  AFTER UPDATE OF assigned_user_id ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_assignment_changed();

-- Ticket comments trigger
DROP TRIGGER IF EXISTS notify_ticket_comment_added_trigger ON public.ticket_comments;
CREATE TRIGGER notify_ticket_comment_added_trigger
  AFTER INSERT ON public.ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_comment_added();

-- Request comments trigger (for legacy table if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'request_comments') THEN
    DROP TRIGGER IF EXISTS notify_request_comment_added_trigger ON public.request_comments;
    CREATE TRIGGER notify_request_comment_added_trigger
      AFTER INSERT ON public.request_comments
      FOR EACH ROW
      EXECUTE FUNCTION public.notify_request_comment_added();
  END IF;
END $$;

-- ============================================================================
-- PART 5: ENSURE notifications table has proper insert policy
-- ============================================================================

-- Make sure the system can insert notifications (some policies may be missing)
DO $$
BEGIN
  -- Check if policy exists, if not create it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
    AND policyname = 'System can insert notifications'
  ) THEN
    CREATE POLICY "System can insert notifications"
      ON public.notifications
      FOR INSERT
      WITH CHECK (true);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Policy already exists, ignore
    NULL;
END $$;

-- ============================================================================
-- DONE
-- ============================================================================
