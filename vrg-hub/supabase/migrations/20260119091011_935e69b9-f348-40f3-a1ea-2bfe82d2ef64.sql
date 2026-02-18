
-- Update the handle_new_user function to apply pending assignments
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  requester_role_id UUID;
  is_o365_import BOOLEAN;
  pending_record RECORD;
  role_id UUID;
  loc_id UUID;
BEGIN
  -- Check if this is an O365 import
  is_o365_import := COALESCE(NEW.raw_user_meta_data->>'imported_from_o365', 'false')::boolean;

  -- Check for pending assignment by email
  SELECT * INTO pending_record
  FROM public.pending_user_assignments
  WHERE email = NEW.email AND applied_at IS NULL
  LIMIT 1;

  -- Insert profile (inactive if O365 import), use pending name if available
  INSERT INTO public.profiles (id, email, full_name, is_active, imported_from_o365)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(pending_record.full_name, NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOT is_o365_import,
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

  -- Apply pending assignments if they exist
  IF pending_record.id IS NOT NULL THEN
    -- Assign pending roles
    IF pending_record.role_ids IS NOT NULL AND array_length(pending_record.role_ids, 1) > 0 THEN
      FOREACH role_id IN ARRAY pending_record.role_ids
      LOOP
        INSERT INTO rbac_user_roles (user_id, role_id)
        VALUES (NEW.id, role_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    -- Assign pending location assignments (for MLOs)
    IF pending_record.location_ids IS NOT NULL AND array_length(pending_record.location_ids, 1) > 0 THEN
      FOREACH loc_id IN ARRAY pending_record.location_ids
      LOOP
        INSERT INTO mlo_assignments (user_id, location_id)
        VALUES (NEW.id, loc_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    -- Mark the pending assignment as applied
    UPDATE public.pending_user_assignments
    SET applied_at = now()
    WHERE id = pending_record.id;
  END IF;
  
  RETURN NEW;
END;
$function$;
