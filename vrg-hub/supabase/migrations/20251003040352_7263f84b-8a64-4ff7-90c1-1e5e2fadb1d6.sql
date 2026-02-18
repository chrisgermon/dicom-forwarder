-- Update email_logs to support all request types
ALTER TABLE public.email_logs
ADD COLUMN request_type text CHECK (request_type IN ('hardware', 'marketing', 'toner', 'user_account')),
ADD COLUMN marketing_request_id uuid REFERENCES public.marketing_requests(id) ON DELETE CASCADE,
ADD COLUMN user_account_request_id uuid REFERENCES public.user_account_requests(id) ON DELETE CASCADE;

-- Add index for different request types
CREATE INDEX idx_email_logs_marketing_request ON public.email_logs(marketing_request_id);
CREATE INDEX idx_email_logs_user_account_request ON public.email_logs(user_account_request_id);

-- Update RLS policies for marketing requests
CREATE POLICY "Users can view email logs for their marketing requests"
  ON public.email_logs
  FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM marketing_requests mr
    WHERE mr.id = email_logs.marketing_request_id
    AND mr.user_id = auth.uid()
  ));

CREATE POLICY "Managers can view email logs for company marketing requests"
  ON public.email_logs
  FOR SELECT
  USING (
    has_role(auth.uid(), (
      SELECT mr.company_id
      FROM marketing_requests mr
      WHERE mr.id = email_logs.marketing_request_id
    ), 'manager'::user_role) OR
    has_role(auth.uid(), (
      SELECT mr.company_id
      FROM marketing_requests mr
      WHERE mr.id = email_logs.marketing_request_id
    ), 'tenant_admin'::user_role) OR
    has_global_role(auth.uid(), 'super_admin'::user_role)
  );

-- RLS for user account requests (using requested_by instead of user_id)
CREATE POLICY "Users can view email logs for their user account requests"
  ON public.email_logs
  FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM user_account_requests uar
    WHERE uar.id = email_logs.user_account_request_id
    AND uar.requested_by = auth.uid()
  ));

CREATE POLICY "Managers can view email logs for company user account requests"
  ON public.email_logs
  FOR SELECT
  USING (
    has_role(auth.uid(), (
      SELECT uar.company_id
      FROM user_account_requests uar
      WHERE uar.id = email_logs.user_account_request_id
    ), 'manager'::user_role) OR
    has_role(auth.uid(), (
      SELECT uar.company_id
      FROM user_account_requests uar
      WHERE uar.id = email_logs.user_account_request_id
    ), 'tenant_admin'::user_role) OR
    has_global_role(auth.uid(), 'super_admin'::user_role)
  );

-- Create company notification settings table
CREATE TABLE public.company_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('hardware', 'marketing', 'toner', 'user_account')),
  recipient_emails text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id, request_type)
);

-- Enable RLS
ALTER TABLE public.company_notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification settings
CREATE POLICY "Tenant admins can manage their company notification settings"
  ON public.company_notification_settings
  FOR ALL
  USING (
    company_id = get_user_company(auth.uid())
    AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role)
  )
  WITH CHECK (
    company_id = get_user_company(auth.uid())
    AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role)
  );

CREATE POLICY "Super admins can manage all notification settings"
  ON public.company_notification_settings
  FOR ALL
  USING (has_global_role(auth.uid(), 'super_admin'::user_role))
  WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Company users can view their company notification settings"
  ON public.company_notification_settings
  FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

-- Add triggers
CREATE TRIGGER update_company_notification_settings_updated_at
  BEFORE UPDATE ON public.company_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER audit_company_notification_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.company_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_trail();