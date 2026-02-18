-- Ensure membership and admin role for Chris Germon at Pinnacle Medical Imaging
DO $$
DECLARE
  v_user_id uuid := '4c4fb826-d689-4c64-a0bd-b9b98b2bcfc5'; -- Chris Germon
  v_company_id uuid := '977643d1-102e-49f5-ae6e-0980651e80c0'; -- Pinnacle Medical Imaging
  v_membership_id uuid;
BEGIN
  -- Create active company membership if missing
  SELECT id INTO v_membership_id
  FROM public.company_memberships
  WHERE user_id = v_user_id AND company_id = v_company_id
  LIMIT 1;

  IF v_membership_id IS NULL THEN
    INSERT INTO public.company_memberships (user_id, company_id, status, is_primary, activated_at)
    VALUES (v_user_id, v_company_id, 'active', true, now())
    RETURNING id INTO v_membership_id;
  ELSE
    UPDATE public.company_memberships
    SET status = 'active', is_primary = true, activated_at = COALESCE(activated_at, now())
    WHERE id = v_membership_id;
  END IF;

  -- Link as primary membership on profile
  UPDATE public.profiles
  SET primary_membership_id = v_membership_id
  WHERE user_id = v_user_id;

  -- Grant company_admin role if none exists yet
  IF NOT EXISTS (
    SELECT 1 FROM public.membership_roles WHERE membership_id = v_membership_id
  ) THEN
    INSERT INTO public.membership_roles (membership_id, role)
    VALUES (v_membership_id, 'company_admin');
  END IF;
END $$;