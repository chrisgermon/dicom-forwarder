-- Allow super admin users to create requests for any company
CREATE POLICY "Super admins can create requests for any company"
ON public.hardware_requests
FOR INSERT
TO authenticated
WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));