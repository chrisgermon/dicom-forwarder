-- Create SharePoint cache table for faster loading
CREATE TABLE IF NOT EXISTS public.sharepoint_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('folder', 'file')),
  item_id TEXT NOT NULL,
  parent_path TEXT NOT NULL,
  name TEXT NOT NULL,
  web_url TEXT,
  size BIGINT,
  child_count INTEGER,
  created_datetime TIMESTAMPTZ,
  last_modified_datetime TIMESTAMPTZ,
  created_by TEXT,
  last_modified_by TEXT,
  file_type TEXT,
  download_url TEXT,
  permissions JSONB,
  metadata JSONB,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, item_id, parent_path)
);

-- Create index for faster lookups
CREATE INDEX idx_sharepoint_cache_lookup ON public.sharepoint_cache(company_id, parent_path, expires_at);
CREATE INDEX idx_sharepoint_cache_expiry ON public.sharepoint_cache(expires_at);

-- Enable RLS
ALTER TABLE public.sharepoint_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view cache if they have O365 connection for that company
CREATE POLICY "Users can view their company cache"
ON public.sharepoint_cache
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.office365_connections
    WHERE office365_connections.user_id = auth.uid()
    AND office365_connections.company_id = sharepoint_cache.company_id
  )
);

-- Policy: Admins can manage all cache
CREATE POLICY "Admins can manage cache"
ON public.sharepoint_cache
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'tenant_admin'::app_role)
);

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION public.clean_expired_sharepoint_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.sharepoint_cache
  WHERE expires_at < NOW();
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_sharepoint_cache_updated_at
BEFORE UPDATE ON public.sharepoint_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();