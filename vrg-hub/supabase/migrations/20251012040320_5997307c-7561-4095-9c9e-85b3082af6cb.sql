-- Add department_request_id to email_logs to correctly relate department requests
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS department_request_id uuid;

-- Add FK constraint to department_requests (nullable, set null on delete)
DO $$ BEGIN
  ALTER TABLE public.email_logs
    ADD CONSTRAINT email_logs_department_request_id_fkey
    FOREIGN KEY (department_request_id)
    REFERENCES public.department_requests(id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_department_request_id ON public.email_logs(department_request_id);

-- Policy: Assigned department users can view email logs for department requests (supports new column)
CREATE POLICY "Assigned department users can view email logs (dept column)"
ON public.email_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.department_requests dr
    WHERE (dr.id = COALESCE(email_logs.department_request_id, email_logs.request_id))
      AND (
        dr.assigned_to = auth.uid()
        OR is_assigned_to_department(auth.uid(), dr.company_id, dr.department, dr.sub_department, 'department')
      )
  )
);

-- Policy: Managers/Tenant Admins/Super Admins can view company department request email logs (supports new column)
CREATE POLICY "Managers can view email logs for company department requests (dept column)"
ON public.email_logs
FOR SELECT
USING (
  (
    has_role(auth.uid(), (
      SELECT dr.company_id FROM public.department_requests dr
      WHERE dr.id = COALESCE(email_logs.department_request_id, email_logs.request_id)
    ), 'manager')
    OR has_role(auth.uid(), (
      SELECT dr.company_id FROM public.department_requests dr
      WHERE dr.id = COALESCE(email_logs.department_request_id, email_logs.request_id)
    ), 'tenant_admin')
    OR has_global_role(auth.uid(), 'super_admin')
  )
);

-- Policy: Requesters can view their own department request email logs (supports new column)
CREATE POLICY "Requesters can view their own department email logs (dept column)"
ON public.email_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.department_requests dr
    WHERE dr.id = COALESCE(email_logs.department_request_id, email_logs.request_id)
      AND dr.user_id = auth.uid()
  )
);
