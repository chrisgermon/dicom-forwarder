-- Create roster cache table
CREATE TABLE public.roster_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roster_type TEXT NOT NULL UNIQUE CHECK (roster_type IN ('staff', 'radiologist')),
  file_name TEXT NOT NULL,
  web_url TEXT NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roster_cache ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read roster cache
CREATE POLICY "Authenticated users can read roster cache"
  ON public.roster_cache FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to manage roster cache (for edge function)
CREATE POLICY "Service role can manage roster cache"
  ON public.roster_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);