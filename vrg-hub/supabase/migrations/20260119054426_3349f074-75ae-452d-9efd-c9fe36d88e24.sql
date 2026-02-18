-- Update is_mlo_manager function to check for marketing_manager instead of mlo_manager
CREATE OR REPLACE FUNCTION public.is_mlo_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rbac_user_roles ur
    JOIN public.rbac_roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id
      AND r.name = 'marketing_manager'
  )
$$;

-- Remove the separate mlo and mlo_manager roles from rbac_roles since we're using marketing/marketing_manager
DELETE FROM public.rbac_role_permissions 
WHERE role_id IN (SELECT id FROM public.rbac_roles WHERE name IN ('mlo', 'mlo_manager'));

DELETE FROM public.rbac_user_roles 
WHERE role_id IN (SELECT id FROM public.rbac_roles WHERE name IN ('mlo', 'mlo_manager'));

DELETE FROM public.rbac_roles WHERE name IN ('mlo', 'mlo_manager');

-- Ensure marketing and marketing_manager roles exist in rbac_roles
INSERT INTO public.rbac_roles (name, description)
VALUES 
  ('marketing', 'MLO / Marketing - Medical Liaison Officers managing referrer relationships and marketing campaigns'),
  ('marketing_manager', 'MLO Manager / Marketing Manager - Can view and manage all MLO visits, assignments, targets, and marketing initiatives')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- Add MLO permissions to marketing role (include effect column)
INSERT INTO public.rbac_role_permissions (role_id, permission_id, effect)
SELECT r.id, p.id, 'allow'
FROM public.rbac_roles r
CROSS JOIN public.rbac_permissions p
WHERE r.name = 'marketing'
AND p.resource = 'mlo'
AND p.action IN ('view_dashboard', 'view_visits', 'create_visit', 'edit_visit', 'delete_visit', 'view_targets')
ON CONFLICT DO NOTHING;

-- Add all MLO permissions (including management) to marketing_manager role
INSERT INTO public.rbac_role_permissions (role_id, permission_id, effect)
SELECT r.id, p.id, 'allow'
FROM public.rbac_roles r
CROSS JOIN public.rbac_permissions p
WHERE r.name = 'marketing_manager'
AND p.resource = 'mlo'
ON CONFLICT DO NOTHING;