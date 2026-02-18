-- Add background_image_url to companies table for custom login page backgrounds
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS background_image_url text;

COMMENT ON COLUMN public.companies.background_image_url IS 'Custom background image URL for company login page';