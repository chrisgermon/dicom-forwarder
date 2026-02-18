-- Add show_on_pages column to system_banners
ALTER TABLE public.system_banners 
ADD COLUMN IF NOT EXISTS show_on_pages TEXT[] DEFAULT ARRAY['all']::TEXT[];