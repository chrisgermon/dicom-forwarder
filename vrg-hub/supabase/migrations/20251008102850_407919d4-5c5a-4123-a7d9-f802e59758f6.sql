-- Create profile for Daniel Hilbert
INSERT INTO public.profiles (
  id,
  user_id,
  company_id,
  name,
  email,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '0d8a3a73-49c0-4d50-8c5b-eae4203ea352',
  '977643d1-102e-49f5-ae6e-0980651e80c0',
  'Daniel Hilbert',
  'daniel@pinnaclemi.com.au',
  now(),
  now()
)
ON CONFLICT (user_id) DO UPDATE SET
  company_id = EXCLUDED.company_id,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  updated_at = now();

-- Create company membership
INSERT INTO public.company_memberships (
  id,
  user_id,
  company_id,
  status,
  is_primary,
  activated_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '0d8a3a73-49c0-4d50-8c5b-eae4203ea352',
  '977643d1-102e-49f5-ae6e-0980651e80c0',
  'active',
  true,
  now(),
  now(),
  now()
)
ON CONFLICT (user_id, company_id) DO UPDATE SET
  status = 'active',
  activated_at = now(),
  updated_at = now();

-- Create approver role for the membership (manager/approver permissions)
WITH membership AS (
  SELECT id FROM public.company_memberships 
  WHERE user_id = '0d8a3a73-49c0-4d50-8c5b-eae4203ea352' 
  AND company_id = '977643d1-102e-49f5-ae6e-0980651e80c0'
)
INSERT INTO public.membership_roles (
  id,
  membership_id,
  role,
  granted_at,
  created_at
)
SELECT
  gen_random_uuid(),
  membership.id,
  'approver',
  now(),
  now()
FROM membership
ON CONFLICT (membership_id, role) DO NOTHING;