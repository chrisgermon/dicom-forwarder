-- Drop the old restrictive policies for hardware and marketing requests
DROP POLICY IF EXISTS "Managers can update requests for approval" ON public.hardware_requests;
DROP POLICY IF EXISTS "Managers can update marketing requests for approval" ON public.marketing_requests;

-- Create new policies that allow tenant admins to update ALL company requests
CREATE POLICY "Tenant admins and managers can update all company hardware requests"
ON public.hardware_requests
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
  has_role(auth.uid(), company_id, 'manager'::user_role) OR
  has_global_role(auth.uid(), 'super_admin'::user_role)
);

CREATE POLICY "Tenant admins and managers can update all company marketing requests"
ON public.marketing_requests
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
  has_role(auth.uid(), company_id, 'manager'::user_role) OR
  has_global_role(auth.uid(), 'super_admin'::user_role)
);