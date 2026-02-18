-- Function to notify when hardware/marketing request is assigned to admin or manager
CREATE OR REPLACE FUNCTION notify_request_admin_manager_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_type TEXT;
  request_url TEXT;
  assigned_user_id UUID;
  assignment_role TEXT;
BEGIN
  request_url := '/requests?request=' || NEW.id;
  
  -- Determine which table and set request type
  CASE TG_TABLE_NAME
    WHEN 'hardware_requests' THEN
      request_type := 'hardware_request';
    WHEN 'marketing_requests' THEN
      request_type := 'marketing_request';
    ELSE
      request_type := 'request';
  END CASE;
  
  -- Check if admin_id changed
  IF NEW.admin_id IS DISTINCT FROM OLD.admin_id AND NEW.admin_id IS NOT NULL THEN
    assigned_user_id := NEW.admin_id;
    assignment_role := 'Admin';
    
    INSERT INTO public.notifications (
      user_id,
      company_id,
      type,
      title,
      message,
      reference_id,
      reference_url
    ) VALUES (
      assigned_user_id,
      NEW.company_id,
      request_type,
      'Request Assigned as ' || assignment_role,
      'You have been assigned as ' || assignment_role || ' to: ' || NEW.title,
      NEW.id,
      request_url
    );
    
    RAISE LOG 'Created notification for admin % for request %', assigned_user_id, NEW.id;
  END IF;
  
  -- Check if manager_id changed
  IF NEW.manager_id IS DISTINCT FROM OLD.manager_id AND NEW.manager_id IS NOT NULL THEN
    assigned_user_id := NEW.manager_id;
    assignment_role := 'Manager';
    
    INSERT INTO public.notifications (
      user_id,
      company_id,
      type,
      title,
      message,
      reference_id,
      reference_url
    ) VALUES (
      assigned_user_id,
      NEW.company_id,
      request_type,
      'Request Assigned as ' || assignment_role,
      'You have been assigned as ' || assignment_role || ' to: ' || NEW.title,
      NEW.id,
      request_url
    );
    
    RAISE LOG 'Created notification for manager % for request %', assigned_user_id, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to notify when user account request is assigned to admin
CREATE OR REPLACE FUNCTION notify_user_account_admin_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify if admin_id changed and is not null
  IF NEW.admin_id IS DISTINCT FROM OLD.admin_id AND NEW.admin_id IS NOT NULL THEN
    
    INSERT INTO public.notifications (
      user_id,
      company_id,
      type,
      title,
      message,
      reference_id,
      reference_url
    ) VALUES (
      NEW.admin_id,
      NEW.company_id,
      'user_account_request',
      'User Account Request Assigned',
      'You have been assigned to user account request for: ' || NEW.requested_for_name,
      NEW.id,
      '/user-accounts?request=' || NEW.id
    );
    
    RAISE LOG 'Created notification for admin % for user account request %', NEW.admin_id, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to notify when department request is assigned
CREATE OR REPLACE FUNCTION notify_department_request_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify if assigned_to changed and is not null
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    
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
      'department_request',
      'Department Request Assigned',
      'You have been assigned to: ' || NEW.title,
      NEW.id,
      '/requests?request=' || NEW.id
    );
    
    RAISE LOG 'Created notification for user % for department request %', NEW.assigned_to, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add triggers for hardware requests
DROP TRIGGER IF EXISTS notify_hardware_request_assignment ON public.hardware_requests;
CREATE TRIGGER notify_hardware_request_assignment
  AFTER INSERT OR UPDATE OF admin_id, manager_id
  ON public.hardware_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_request_admin_manager_assignment();

-- Add triggers for marketing requests
DROP TRIGGER IF EXISTS notify_marketing_request_assignment ON public.marketing_requests;
CREATE TRIGGER notify_marketing_request_assignment
  AFTER INSERT OR UPDATE OF admin_id, manager_id
  ON public.marketing_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_request_admin_manager_assignment();

-- Add trigger for user account requests
DROP TRIGGER IF EXISTS notify_user_account_request_assignment ON public.user_account_requests;
CREATE TRIGGER notify_user_account_request_assignment
  AFTER INSERT OR UPDATE OF admin_id
  ON public.user_account_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_account_admin_assignment();

-- Add trigger for department requests
DROP TRIGGER IF EXISTS notify_department_request_assignment ON public.department_requests;
CREATE TRIGGER notify_department_request_assignment
  AFTER INSERT OR UPDATE OF assigned_to
  ON public.department_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_department_request_assignment();