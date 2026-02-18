-- Add policy for super admins to create department requests for any company
CREATE POLICY "Super admins can create department requests for any company"
ON public.department_requests
FOR INSERT
TO authenticated
WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));