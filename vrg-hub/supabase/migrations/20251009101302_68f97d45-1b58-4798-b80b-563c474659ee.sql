-- Add custom_sections column to company_home_pages table
ALTER TABLE public.company_home_pages 
ADD COLUMN IF NOT EXISTS custom_sections jsonb DEFAULT '[]'::jsonb;