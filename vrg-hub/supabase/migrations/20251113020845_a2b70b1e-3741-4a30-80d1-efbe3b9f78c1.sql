-- Create table to track Office 365 sync jobs
CREATE TABLE IF NOT EXISTS public.office365_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  started_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  users_synced INTEGER DEFAULT 0,
  mailboxes_synced INTEGER DEFAULT 0,
  users_created INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_office365_sync_jobs_company_id ON public.office365_sync_jobs(company_id);
CREATE INDEX idx_office365_sync_jobs_status ON public.office365_sync_jobs(status);
CREATE INDEX idx_office365_sync_jobs_started_at ON public.office365_sync_jobs(started_at DESC);

-- Enable RLS
ALTER TABLE public.office365_sync_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view sync jobs for their company"
  ON public.office365_sync_jobs
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id::text FROM public.office365_connections WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert sync jobs"
  ON public.office365_sync_jobs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'tenant_admin')
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_office365_sync_jobs_updated_at
  BEFORE UPDATE ON public.office365_sync_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();