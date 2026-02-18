-- Add section_owner_id column as UUID reference to profiles
ALTER TABLE public.clinic_setup_sections 
ADD COLUMN section_owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX idx_clinic_setup_sections_owner_id ON public.clinic_setup_sections(section_owner_id);