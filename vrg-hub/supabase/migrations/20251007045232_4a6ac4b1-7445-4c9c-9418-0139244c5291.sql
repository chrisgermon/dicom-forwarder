
-- Create profile for cgermon@pinnaclemi.com.au
-- This user authenticated via Azure AD but profile wasn't auto-created

DO $$
DECLARE
  v_user_id UUID := '4c4fb826-d689-4c64-a0bd-b9b98b2bcfc5';
  v_company_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Get user email from auth.users
  SELECT email, COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', email)
  INTO v_user_email, v_user_name
  FROM auth.users
  WHERE id = v_user_id;

  -- Get matching company from domain
  SELECT company_id INTO v_company_id
  FROM company_domains
  WHERE active = true
    AND v_user_email ILIKE '%' || domain
  ORDER BY created_at DESC
  LIMIT 1;

  -- Create profile if user and company found
  IF v_user_email IS NOT NULL AND v_company_id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, company_id, name, email)
    VALUES (v_user_id, v_company_id, v_user_name, v_user_email)
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Profile created for user % with company %', v_user_email, v_company_id;
  ELSE
    RAISE NOTICE 'Could not create profile: user_email=%, company_id=%', v_user_email, v_company_id;
  END IF;
END $$;
