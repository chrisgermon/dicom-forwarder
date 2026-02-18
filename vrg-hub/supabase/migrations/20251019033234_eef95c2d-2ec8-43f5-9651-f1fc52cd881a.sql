-- Migrate existing user_roles to rbac_user_roles
-- This creates RBAC role assignments for all existing users based on their old app_role

INSERT INTO rbac_user_roles (user_id, role_id)
SELECT 
  ur.user_id,
  r.id
FROM user_roles ur
JOIN rbac_roles r ON r.name = ur.role::text
WHERE NOT EXISTS (
  SELECT 1 FROM rbac_user_roles rur 
  WHERE rur.user_id = ur.user_id AND rur.role_id = r.id
)
ON CONFLICT DO NOTHING;

-- Update the handle_new_user function to use RBAC roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  requester_role_id UUID;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Get the requester role ID from rbac_roles
  SELECT id INTO requester_role_id
  FROM rbac_roles
  WHERE name = 'requester'
  LIMIT 1;
  
  -- Assign default 'requester' role in old system (for backwards compatibility during transition)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'requester'::public.app_role);
  
  -- Assign default 'requester' role in RBAC system
  IF requester_role_id IS NOT NULL THEN
    INSERT INTO rbac_user_roles (user_id, role_id)
    VALUES (NEW.id, requester_role_id);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create a function to check RBAC roles (replaces has_role eventually)
CREATE OR REPLACE FUNCTION public.has_rbac_role(_user_id uuid, _role_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM rbac_user_roles ur
    JOIN rbac_roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id
      AND r.name = _role_name
  )
$$;