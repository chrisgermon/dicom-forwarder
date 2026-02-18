-- Add site_code column to clinics table
ALTER TABLE public.clinics ADD COLUMN site_code text;

-- Add a comment for clarity
COMMENT ON COLUMN public.clinics.site_code IS '3-letter site code used for AE Title generation';