-- Add RLS policies for department and toner requests on email_logs

-- Users can view email logs for their department requests
CREATE POLICY "Users can view email logs for their department requests"
ON public.email_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.department_requests dr
    WHERE dr.id = email_logs.request_id
      AND dr.user_id = auth.uid()
  )
);

-- Managers can view email logs for company department requests
CREATE POLICY "Managers can view email logs for company department requests"
ON public.email_logs
FOR SELECT
USING (
  has_role(auth.uid(), (
    SELECT dr.company_id FROM public.department_requests dr
    WHERE dr.id = email_logs.request_id
  ), 'manager'::user_role)
  OR has_role(auth.uid(), (
    SELECT dr.company_id FROM public.department_requests dr
    WHERE dr.id = email_logs.request_id
  ), 'tenant_admin'::user_role)
  OR has_global_role(auth.uid(), 'super_admin'::user_role)
);

-- Users can view email logs for their toner requests
CREATE POLICY "Users can view email logs for their toner requests"
ON public.email_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.toner_requests tr
    WHERE tr.id = email_logs.request_id
      AND tr.user_id = auth.uid()
  )
);

-- Managers can view email logs for company toner requests
CREATE POLICY "Managers can view email logs for company toner requests"
ON public.email_logs
FOR SELECT
USING (
  has_role(auth.uid(), (
    SELECT tr.company_id FROM public.toner_requests tr
    WHERE tr.id = email_logs.request_id
  ), 'manager'::user_role)
  OR has_role(auth.uid(), (
    SELECT tr.company_id FROM public.toner_requests tr
    WHERE tr.id = email_logs.request_id
  ), 'tenant_admin'::user_role)
  OR has_global_role(auth.uid(), 'super_admin'::user_role)
);
