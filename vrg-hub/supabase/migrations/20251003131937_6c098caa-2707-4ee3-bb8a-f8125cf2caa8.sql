-- Create profiles for system users that don't have one
-- This handles the case where auth users were created but profile trigger didn't run

DO $$
DECLARE
  crowd_it_company_id uuid;
  system_user_id uuid;
BEGIN
  -- Get Crowd IT company ID
  SELECT id INTO crowd_it_company_id
  FROM public.companies
  WHERE name = 'Crowd IT'
  LIMIT 1;

  -- Check if crowdit@system.local exists in auth.users
  SELECT id INTO system_user_id
  FROM auth.users
  WHERE email = 'crowdit@system.local'
  LIMIT 1;

  -- If the user exists but has no profile, create one
  IF system_user_id IS NOT NULL AND crowd_it_company_id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, company_id, name, email)
    VALUES (
      system_user_id,
      crowd_it_company_id,
      'System Administrator',
      'crowdit@system.local'
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Ensure they have super_admin role
    INSERT INTO public.user_roles (user_id, company_id, role)
    VALUES (
      system_user_id,
      crowd_it_company_id,
      'super_admin'
    )
    ON CONFLICT (user_id, company_id) 
    DO UPDATE SET role = 'super_admin';
  END IF;
END $$;

-- Also create a function to sync any orphaned auth users to profiles
CREATE OR REPLACE FUNCTION public.sync_orphaned_auth_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  user_email TEXT;
  user_domain TEXT;
  matching_company_id UUID;
BEGIN
  -- Find auth users without profiles
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.user_id = au.id
    WHERE p.user_id IS NULL
  LOOP
    user_email := user_record.email;
    
    IF user_email IS NOT NULL THEN
      user_domain := split_part(user_email, '@', 2);
      
      -- Try to match company by domain
      SELECT cd.company_id INTO matching_company_id
      FROM public.company_domains cd
      JOIN public.companies c ON c.id = cd.company_id
      WHERE cd.domain = user_domain 
        AND cd.active = true 
        AND c.active = true
      LIMIT 1;
      
      IF matching_company_id IS NOT NULL THEN
        -- Create profile
        INSERT INTO public.profiles (user_id, company_id, name, email)
        VALUES (
          user_record.id,
          matching_company_id,
          COALESCE(user_record.raw_user_meta_data ->> 'full_name', user_record.raw_user_meta_data ->> 'name', 'Unknown User'),
          user_email
        )
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Assign default role
        INSERT INTO public.user_roles (user_id, company_id, role)
        VALUES (user_record.id, matching_company_id, 'requester')
        ON CONFLICT (user_id, company_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END;
$$;