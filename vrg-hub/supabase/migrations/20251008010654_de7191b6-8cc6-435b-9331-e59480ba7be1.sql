-- Create table for Notifyre fax campaigns
CREATE TABLE IF NOT EXISTS public.notifyre_fax_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  campaign_name text,
  total_recipients integer DEFAULT 0,
  delivered integer DEFAULT 0,
  failed integer DEFAULT 0,
  pending integer DEFAULT 0,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create table for individual fax logs
CREATE TABLE IF NOT EXISTS public.notifyre_fax_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.notifyre_fax_campaigns(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  notifyre_fax_id text,
  recipient text NOT NULL,
  recipient_name text,
  status text NOT NULL DEFAULT 'pending',
  error text,
  pages integer,
  duration integer,
  cost numeric(10,2),
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  failed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifyre_fax_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifyre_fax_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaigns
CREATE POLICY "Users can view their company campaigns"
  ON public.notifyre_fax_campaigns
  FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage campaigns"
  ON public.notifyre_fax_campaigns
  FOR ALL
  USING (
    has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR 
    has_global_role(auth.uid(), 'super_admin'::user_role)
  );

-- RLS Policies for logs
CREATE POLICY "Users can view their company logs"
  ON public.notifyre_fax_logs
  FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage logs"
  ON public.notifyre_fax_logs
  FOR ALL
  USING (
    has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR 
    has_global_role(auth.uid(), 'super_admin'::user_role)
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifyre_fax_campaigns_company_id ON public.notifyre_fax_campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_notifyre_fax_campaigns_sent_at ON public.notifyre_fax_campaigns(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifyre_fax_logs_campaign_id ON public.notifyre_fax_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_notifyre_fax_logs_company_id ON public.notifyre_fax_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_notifyre_fax_logs_status ON public.notifyre_fax_logs(status);