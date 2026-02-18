-- Fix status history trigger to work with service-role updates (edge functions)
-- It now falls back to the actor columns when auth.uid() is null
CREATE OR REPLACE FUNCTION public.track_request_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.request_status_history (request_id, status, changed_by, notes)
    VALUES (
      NEW.id,
      NEW.status,
      COALESCE(auth.uid(), NEW.admin_id, NEW.manager_id, NEW.declined_by),
      'Status changed from ' || OLD.status || ' to ' || NEW.status
    );
  END IF;
  
  RETURN NEW;
END;
$$;