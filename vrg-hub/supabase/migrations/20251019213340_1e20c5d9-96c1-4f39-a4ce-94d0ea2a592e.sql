-- Add is_active and imported_from_o365 columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS imported_from_o365 BOOLEAN DEFAULT false;

-- Update handle_new_user function to check for O365 import flag
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  requester_role_id UUID;
  is_o365_import BOOLEAN;
BEGIN
  -- Check if this is an O365 import
  is_o365_import := COALESCE(NEW.raw_user_meta_data->>'imported_from_o365', 'false')::boolean;

  -- Insert profile (inactive if O365 import)
  INSERT INTO public.profiles (id, email, full_name, is_active, imported_from_o365)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOT is_o365_import,  -- Active by default unless O365 import
    is_o365_import
  );
  
  -- Get the requester role ID from rbac_roles
  SELECT id INTO requester_role_id
  FROM rbac_roles
  WHERE name = 'requester'
  LIMIT 1;
  
  -- Assign default 'requester' role in old system
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