-- Create table for MLO Performance shared links
CREATE TABLE public.mlo_performance_shared_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.mlo_performance_shared_links ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create links
CREATE POLICY "Authenticated users can create MLO performance share links"
ON public.mlo_performance_shared_links
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Allow authenticated users to view their own links
CREATE POLICY "Users can view their own MLO performance share links"
ON public.mlo_performance_shared_links
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Allow public access for valid tokens (for the shared view)
CREATE POLICY "Public can access active MLO performance links by token"
ON public.mlo_performance_shared_links
FOR SELECT
TO anon
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Allow anon to update access count
CREATE POLICY "Anon can update access count on active links"
ON public.mlo_performance_shared_links
FOR UPDATE
TO anon
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()))
WITH CHECK (is_active = true);

-- Add index for token lookups
CREATE INDEX idx_mlo_performance_shared_links_token ON public.mlo_performance_shared_links(share_token);
CREATE INDEX idx_mlo_performance_shared_links_active ON public.mlo_performance_shared_links(is_active, expires_at);