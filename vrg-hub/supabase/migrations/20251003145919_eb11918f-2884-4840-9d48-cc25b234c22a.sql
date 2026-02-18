-- Add company_id to role_permissions to make permissions company-specific
ALTER TABLE public.role_permissions ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Drop old unique constraint and create new one including company_id
ALTER TABLE public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_permission_key_key;
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_company_role_permission_unique UNIQUE (company_id, role, permission_key);

-- Update RLS policies for company-based permissions
DROP POLICY IF EXISTS "Super admins can manage all role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Users can view their role permissions" ON public.role_permissions;

-- Super admins can manage all role permissions
CREATE POLICY "Super admins can manage all role permissions"
ON public.role_permissions
FOR ALL
USING (has_global_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Tenant admins can manage their company's role permissions
CREATE POLICY "Tenant admins can manage their company role permissions"
ON public.role_permissions
FOR ALL
USING (
  company_id = get_user_company(auth.uid()) 
  AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role)
)
WITH CHECK (
  company_id = get_user_company(auth.uid()) 
  AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role)
);

-- Users can view their company's role permissions
CREATE POLICY "Users can view their company role permissions"
ON public.role_permissions
FOR SELECT
USING (company_id = get_user_company(auth.uid()));

-- Migrate existing global permissions to each company
INSERT INTO public.role_permissions (company_id, role, permission_key, enabled)
SELECT 
  c.id as company_id,
  rp.role,
  rp.permission_key,
  rp.enabled
FROM public.companies c
CROSS JOIN (SELECT DISTINCT role, permission_key, enabled FROM public.role_permissions WHERE company_id IS NULL) rp
ON CONFLICT (company_id, role, permission_key) DO NOTHING;

-- Delete old global permissions
DELETE FROM public.role_permissions WHERE company_id IS NULL;

-- Make company_id NOT NULL now that we've migrated data
ALTER TABLE public.role_permissions ALTER COLUMN company_id SET NOT NULL;