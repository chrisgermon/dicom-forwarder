-- Add RLS policy to allow tenant admins to manage their company features
CREATE POLICY "Tenant admins can manage their company features"
ON public.company_features
FOR ALL
TO authenticated
USING (
  company_id = get_user_company(auth.uid()) 
  AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role)
)
WITH CHECK (
  company_id = get_user_company(auth.uid()) 
  AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role)
);