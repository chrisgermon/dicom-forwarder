-- Add new columns to newsletter_assignments
ALTER TABLE public.newsletter_assignments 
ADD COLUMN IF NOT EXISTS template_id UUID;

-- Add new columns to newsletter_submissions
ALTER TABLE public.newsletter_submissions
ADD COLUMN IF NOT EXISTS clinic_updates JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS no_update_this_month BOOLEAN DEFAULT false;