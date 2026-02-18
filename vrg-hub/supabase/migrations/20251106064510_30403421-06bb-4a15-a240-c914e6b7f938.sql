-- Update profiles table RLS policy to be more restrictive
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can read all profiles" ON public.profiles;

-- Create new restrictive policy with role-based exceptions
CREATE POLICY "Users can read own profile and admins can read all"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id 
  OR 
  has_role(auth.uid(), 'super_admin'::app_role)
  OR
  has_role(auth.uid(), 'tenant_admin'::app_role)
  OR
  has_rbac_role(auth.uid(), 'super_admin')
  OR
  has_rbac_role(auth.uid(), 'tenant_admin')
);

-- Add search_path to remaining functions that don't have it
-- Update functions to include search_path for security

-- update_tickets_updated_at
CREATE OR REPLACE FUNCTION public.update_tickets_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- log_request_status_change
CREATE OR REPLACE FUNCTION public.log_request_status_change()
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

-- get_request_approver
CREATE OR REPLACE FUNCTION public.get_request_approver(p_brand_id uuid, p_location_id uuid, p_request_type_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approver_id uuid;
BEGIN
  -- First try to find manager role users for the brand/location
  SELECT p.id INTO v_approver_id
  FROM profiles p
  WHERE p.role IN ('manager', 'tenant_admin', 'super_admin')
    AND (p.brand_id = p_brand_id OR p.brand_id IS NULL)
    AND (p.location_id = p_location_id OR p.location_id IS NULL)
  ORDER BY 
    CASE p.role
      WHEN 'manager' THEN 1
      WHEN 'tenant_admin' THEN 2
      WHEN 'super_admin' THEN 3
    END
  LIMIT 1;
  
  -- If no manager found, get any admin
  IF v_approver_id IS NULL THEN
    SELECT p.id INTO v_approver_id
    FROM profiles p
    WHERE p.role IN ('tenant_admin', 'super_admin')
    LIMIT 1;
  END IF;
  
  RETURN v_approver_id;
END;
$$;

-- clean_expired_sharepoint_cache
CREATE OR REPLACE FUNCTION public.clean_expired_sharepoint_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.sharepoint_cache
  WHERE expires_at < NOW();
END;
$$;

-- audit_log_changes
CREATE OR REPLACE FUNCTION public.audit_log_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;