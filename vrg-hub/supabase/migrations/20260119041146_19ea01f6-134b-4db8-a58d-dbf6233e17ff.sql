-- Create clinic_practice_managers table to store practice managers for synced clinics
CREATE TABLE public.clinic_practice_managers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_key INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for clinic lookup
CREATE INDEX idx_clinic_practice_managers_clinic_key ON public.clinic_practice_managers(clinic_key);

-- Enable RLS
ALTER TABLE public.clinic_practice_managers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view practice managers
CREATE POLICY "Authenticated users can view practice managers"
ON public.clinic_practice_managers
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to manage practice managers
CREATE POLICY "Authenticated users can insert practice managers"
ON public.clinic_practice_managers
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update practice managers"
ON public.clinic_practice_managers
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete practice managers"
ON public.clinic_practice_managers
FOR DELETE
TO authenticated
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_clinic_practice_managers_updated_at
BEFORE UPDATE ON public.clinic_practice_managers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();