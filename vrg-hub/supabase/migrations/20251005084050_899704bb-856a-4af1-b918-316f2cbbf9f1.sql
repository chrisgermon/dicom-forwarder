-- Allow tenant admins to manage menu configurations for their roles
DROP POLICY IF EXISTS "Tenant admins can view menu configs" ON public.menu_configurations;

CREATE POLICY "Tenant admins can manage menu configs"
ON public.menu_configurations
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin'::user_role)
  AND role IN (
    SELECT ur.role 
    FROM user_roles ur 
    WHERE ur.user_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin'::user_role)
  AND role IN (
    SELECT ur.role 
    FROM user_roles ur 
    WHERE ur.user_id = auth.uid()
  )
);