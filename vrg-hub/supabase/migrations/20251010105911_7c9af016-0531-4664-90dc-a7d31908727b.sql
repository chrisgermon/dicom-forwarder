-- Add SELECT policy to allow super admins to view all email logs
CREATE POLICY "Super admins can view all email logs"
ON public.email_logs
FOR SELECT
USING (has_global_role(auth.uid(), 'super_admin'::user_role));