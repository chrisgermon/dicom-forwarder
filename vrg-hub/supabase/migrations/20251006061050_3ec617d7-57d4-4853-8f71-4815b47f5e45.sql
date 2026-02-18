-- Fix RLS policy for helpdesk_department_managers to allow inserts
DROP POLICY IF EXISTS "Admins can manage department managers" ON helpdesk_department_managers;

-- Create separate policies for better clarity
CREATE POLICY "Admins can insert department managers"
ON helpdesk_department_managers
FOR INSERT
TO authenticated
WITH CHECK (
  (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role))
  OR has_global_role(auth.uid(), 'super_admin'::user_role)
);

CREATE POLICY "Admins can update department managers"
ON helpdesk_department_managers
FOR UPDATE
TO authenticated
USING (
  (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role))
  OR has_global_role(auth.uid(), 'super_admin'::user_role)
)
WITH CHECK (
  (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role))
  OR has_global_role(auth.uid(), 'super_admin'::user_role)
);

CREATE POLICY "Admins can delete department managers"
ON helpdesk_department_managers
FOR DELETE
TO authenticated
USING (
  (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role))
  OR has_global_role(auth.uid(), 'super_admin'::user_role)
);

CREATE POLICY "Admins can view department managers"
ON helpdesk_department_managers
FOR SELECT
TO authenticated
USING (
  (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role))
  OR has_global_role(auth.uid(), 'super_admin'::user_role)
  OR user_id = auth.uid()
);