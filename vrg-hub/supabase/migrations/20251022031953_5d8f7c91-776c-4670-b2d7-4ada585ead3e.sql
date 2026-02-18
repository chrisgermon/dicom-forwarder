-- Fix security issue: Set search_path for log_request_status_change function
-- Drop trigger first, then function, then recreate both
DROP TRIGGER IF EXISTS hardware_requests_activity_trigger ON hardware_requests;
DROP FUNCTION IF EXISTS log_request_status_change();

CREATE OR REPLACE FUNCTION log_request_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO request_activity (
      request_id,
      request_type,
      user_id,
      activity_type,
      old_value,
      new_value
    ) VALUES (
      NEW.id,
      'hardware',
      auth.uid(),
      'status_change',
      OLD.status,
      NEW.status
    );
  END IF;
  
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO request_activity (
      request_id,
      request_type,
      user_id,
      activity_type,
      old_value,
      new_value
    ) VALUES (
      NEW.id,
      'hardware',
      auth.uid(),
      'assignment_change',
      OLD.assigned_to::text,
      NEW.assigned_to::text
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER hardware_requests_activity_trigger
AFTER UPDATE ON hardware_requests
FOR EACH ROW
EXECUTE FUNCTION log_request_status_change();