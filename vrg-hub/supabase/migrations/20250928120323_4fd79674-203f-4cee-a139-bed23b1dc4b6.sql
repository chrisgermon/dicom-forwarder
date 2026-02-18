-- Update chris@crowdit.com.au to super admin role
UPDATE public.user_roles 
SET role = 'super_admin'::user_role
FROM public.profiles p
WHERE user_roles.user_id = p.user_id 
AND p.email = 'chris@crowdit.com.au';