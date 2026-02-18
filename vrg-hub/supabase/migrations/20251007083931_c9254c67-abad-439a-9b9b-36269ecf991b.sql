-- Ensure crowdit@system.local is the only super admin
DO $$
DECLARE
  system_user_id UUID;
BEGIN
  -- Get the user_id for crowdit@system.local
  SELECT id INTO system_user_id
  FROM auth.users
  WHERE email = 'crowdit@system.local'
  LIMIT 1;

  IF system_user_id IS NOT NULL THEN
    -- Ensure this user has platform_admin role
    INSERT INTO public.platform_roles (user_id, role)
    VALUES (system_user_id, 'platform_admin')
    ON CONFLICT (user_id, role) DO UPDATE SET granted_at = now();

    -- Remove all other platform_admin roles (keep only crowdit@system.local)
    DELETE FROM public.platform_roles
    WHERE user_id != system_user_id;
  END IF;
END $$;

-- Add a comment to document this
COMMENT ON TABLE public.platform_roles IS 'Only crowdit@system.local should have platform_admin role for system administration';

-- Create a function to check if user is the system admin
CREATE OR REPLACE FUNCTION public.is_system_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = _user_id
      AND email = 'crowdit@system.local'
      AND EXISTS (
        SELECT 1
        FROM public.platform_roles
        WHERE user_id = _user_id
          AND role = 'platform_admin'
      )
  )
$$;