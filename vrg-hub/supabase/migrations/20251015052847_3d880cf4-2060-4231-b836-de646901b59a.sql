
-- Fix audit_log_changes function to handle tables without user_id column
CREATE OR REPLACE FUNCTION public.audit_log_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_email TEXT;
  record_user_id UUID;
BEGIN
  -- Safely get user_id from NEW or OLD record if it exists
  BEGIN
    IF TG_OP = 'DELETE' THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = TG_TABLE_SCHEMA AND table_name = TG_TABLE_NAME AND column_name = 'user_id') THEN
        record_user_id := (to_jsonb(OLD)->>'user_id')::UUID;
      END IF;
    ELSE
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = TG_TABLE_SCHEMA AND table_name = TG_TABLE_NAME AND column_name = 'user_id') THEN
        record_user_id := (to_jsonb(NEW)->>'user_id')::UUID;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    record_user_id := NULL;
  END;

  -- Get user email from auth.users if user_id is available
  IF record_user_id IS NOT NULL THEN
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = record_user_id;
  ELSE
    -- Try to get from auth.uid() if available
    BEGIN
      SELECT email INTO user_email
      FROM auth.users
      WHERE id = auth.uid();
    EXCEPTION WHEN OTHERS THEN
      user_email := NULL;
    END;
  END IF;

  -- Insert audit log
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      user_id,
      user_email,
      action,
      table_name,
      record_id,
      old_data,
      new_data
    ) VALUES (
      record_user_id,
      user_email,
      TG_OP,
      TG_TABLE_NAME,
      OLD.id::text,
      row_to_json(OLD),
      NULL
    );
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id,
      user_email,
      action,
      table_name,
      record_id,
      old_data,
      new_data
    ) VALUES (
      record_user_id,
      user_email,
      TG_OP,
      TG_TABLE_NAME,
      NEW.id::text,
      NULL,
      row_to_json(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      user_id,
      user_email,
      action,
      table_name,
      record_id,
      old_data,
      new_data
    ) VALUES (
      record_user_id,
      user_email,
      TG_OP,
      TG_TABLE_NAME,
      NEW.id::text,
      row_to_json(OLD),
      row_to_json(NEW)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$;
