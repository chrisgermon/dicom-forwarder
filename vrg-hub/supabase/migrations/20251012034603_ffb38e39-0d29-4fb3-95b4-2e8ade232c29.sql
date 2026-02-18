-- Allow assigned department responders to view email logs for their requests
CREATE POLICY "Assigned department users can view email logs"
ON public.email_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.department_requests dr
    WHERE dr.id = email_logs.request_id
      AND (
        dr.assigned_to = auth.uid()
        OR is_assigned_to_department(auth.uid(), dr.company_id, dr.department, dr.sub_department, 'department')
      )
  )
);
