-- Add color scheme fields to companies table
ALTER TABLE public.companies
ADD COLUMN primary_color TEXT DEFAULT '221.2 83.2% 53.3%',
ADD COLUMN secondary_color TEXT DEFAULT '210 40% 96.1%',
ADD COLUMN accent_color TEXT DEFAULT '210 40% 96.1%',
ADD COLUMN background_color TEXT DEFAULT '0 0% 100%',
ADD COLUMN foreground_color TEXT DEFAULT '222.2 84% 4.9%',
ADD COLUMN muted_color TEXT DEFAULT '210 40% 96.1%',
ADD COLUMN muted_foreground_color TEXT DEFAULT '215.4 16.3% 46.9%',
ADD COLUMN card_color TEXT DEFAULT '0 0% 100%',
ADD COLUMN card_foreground_color TEXT DEFAULT '222.2 84% 4.9%',
ADD COLUMN border_color TEXT DEFAULT '214.3 31.8% 91.4%',
ADD COLUMN use_custom_colors BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.companies.primary_color IS 'Primary brand color in HSL format (h s% l%)';
COMMENT ON COLUMN public.companies.secondary_color IS 'Secondary brand color in HSL format';
COMMENT ON COLUMN public.companies.accent_color IS 'Accent color for highlights in HSL format';
COMMENT ON COLUMN public.companies.use_custom_colors IS 'Whether to use custom color scheme or default';