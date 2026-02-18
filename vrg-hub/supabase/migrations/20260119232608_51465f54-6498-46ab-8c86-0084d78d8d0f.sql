-- Add assigned_to column to clinic_setup_items table
ALTER TABLE public.clinic_setup_items 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_clinic_setup_items_assigned_to 
ON public.clinic_setup_items(assigned_to);