-- Policy to allow requesters to view their own department request email logs
CREATE POLICY "Requesters can view their own department email logs"
ON public.email_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.department_requests dr
    WHERE dr.id = email_logs.request_id
      AND dr.user_id = auth.uid()
  )
);
