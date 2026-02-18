-- Add hero section fields to company_home_pages table
ALTER TABLE public.company_home_pages
ADD COLUMN IF NOT EXISTS hero_title TEXT DEFAULT 'Welcome to CrowdHub',
ADD COLUMN IF NOT EXISTS hero_subtitle TEXT DEFAULT 'Your central hub for all requests and services',
ADD COLUMN IF NOT EXISTS hero_background TEXT DEFAULT '/hero-background.jpg';

-- Add comment
COMMENT ON COLUMN public.company_home_pages.hero_title IS 'Title displayed in the hero section';
COMMENT ON COLUMN public.company_home_pages.hero_subtitle IS 'Subtitle displayed in the hero section';
COMMENT ON COLUMN public.company_home_pages.hero_background IS 'Background image URL for the hero section';