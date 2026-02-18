-- Create Notifyre fax campaigns table for single-tenant mode
CREATE TABLE IF NOT EXISTS public.notifyre_fax_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text NOT NULL UNIQUE,
  campaign_name text,
  contact_group_id text,
  contact_group_name text,
  total_recipients integer DEFAULT 0,
  delivered_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  pending_count integer DEFAULT 0,
  sent_at timestamp with time zone,
  document_path text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create Notifyre fax logs table for single-tenant mode
CREATE TABLE IF NOT EXISTS public.notifyre_fax_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.notifyre_fax_campaigns(id) ON DELETE CASCADE,
  notifyre_fax_id text UNIQUE,
  recipient_number text NOT NULL,
  recipient_name text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  pages_sent integer,
  duration_seconds integer,
  cost_cents integer,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  failed_at timestamp with time zone,
  document_url text,
  document_id text,
  document_path text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create sync history table for single-tenant mode
CREATE TABLE IF NOT EXISTS public.notifyre_sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  synced_by uuid REFERENCES auth.users(id),
  from_date timestamp with time zone NOT NULL,
  to_date timestamp with time zone NOT NULL,
  campaigns_synced integer NOT NULL DEFAULT 0,
  faxes_synced integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifyre_fax_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifyre_fax_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifyre_sync_history ENABLE ROW LEVEL SECURITY;

-- Create policies for campaigns
CREATE POLICY "Users can view fax campaigns"
  ON public.notifyre_fax_campaigns
  FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'tenant_admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role)
  );

-- Create policies for logs
CREATE POLICY "Users can view fax logs"
  ON public.notifyre_fax_logs
  FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'tenant_admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role)
  );

-- Create policies for sync history
CREATE POLICY "Users can view sync history"
  ON public.notifyre_sync_history
  FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'tenant_admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Users can create sync history"
  ON public.notifyre_sync_history
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'tenant_admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role)
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fax_campaigns_sent_at ON public.notifyre_fax_campaigns(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_fax_logs_campaign_id ON public.notifyre_fax_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_fax_logs_status ON public.notifyre_fax_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_history_created_at ON public.notifyre_sync_history(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_notifyre_fax_campaigns_updated_at
  BEFORE UPDATE ON public.notifyre_fax_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notifyre_fax_logs_updated_at
  BEFORE UPDATE ON public.notifyre_fax_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
