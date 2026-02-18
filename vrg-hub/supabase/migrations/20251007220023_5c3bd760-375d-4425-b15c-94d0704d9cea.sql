-- Create table for Notifyre fax campaigns
CREATE TABLE IF NOT EXISTS public.notifyre_fax_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  campaign_id text NOT NULL,
  campaign_name text,
  total_recipients integer DEFAULT 0,
  delivered_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  pending_count integer DEFAULT 0,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(company_id, campaign_id)
);

-- Create table for individual fax logs
CREATE TABLE IF NOT EXISTS public.notifyre_fax_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.notifyre_fax_campaigns(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recipient_number text NOT NULL,
  recipient_name text,
  status text NOT NULL, -- 'delivered', 'failed', 'pending', 'processing'
  error_message text,
  pages_sent integer,
  duration_seconds integer,
  cost_cents integer,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  failed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifyre_campaigns_company ON public.notifyre_fax_campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_notifyre_campaigns_sent_at ON public.notifyre_fax_campaigns(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifyre_logs_campaign ON public.notifyre_fax_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_notifyre_logs_company ON public.notifyre_fax_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_notifyre_logs_status ON public.notifyre_fax_logs(status);

-- Enable RLS
ALTER TABLE public.notifyre_fax_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifyre_fax_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaigns
CREATE POLICY "Users can view their company fax campaigns"
  ON public.notifyre_fax_campaigns FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage fax campaigns"
  ON public.notifyre_fax_campaigns FOR ALL
  USING (
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR has_global_role(auth.uid(), 'super_admin'::user_role))
  );

-- RLS Policies for logs
CREATE POLICY "Users can view their company fax logs"
  ON public.notifyre_fax_logs FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage fax logs"
  ON public.notifyre_fax_logs FOR ALL
  USING (
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR has_global_role(auth.uid(), 'super_admin'::user_role))
  );

-- System can insert logs
CREATE POLICY "System can insert fax logs"
  ON public.notifyre_fax_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can insert fax campaigns"
  ON public.notifyre_fax_campaigns FOR INSERT
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_notifyre_campaigns_updated_at
  BEFORE UPDATE ON public.notifyre_fax_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notifyre_logs_updated_at
  BEFORE UPDATE ON public.notifyre_fax_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();