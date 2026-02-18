
-- Add manager role for sluu@visionradiology.com.au to enable newsletter access
INSERT INTO public.user_roles (user_id, company_id, role)
VALUES (
  '9a453a87-8cd9-45f0-a07b-24c256a5f2de',
  '440b33e2-326e-405d-9e1b-942f22ad2553',
  'manager'
)
ON CONFLICT (user_id, company_id) DO UPDATE
SET role = 'manager';
