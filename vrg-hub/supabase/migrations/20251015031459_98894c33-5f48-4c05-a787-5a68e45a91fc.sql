-- Add brand_id and location_id to modalities table
ALTER TABLE public.modalities 
ADD COLUMN brand_id uuid REFERENCES public.brands(id),
ADD COLUMN location_id uuid REFERENCES public.locations(id);

-- Create index for better query performance
CREATE INDEX idx_modalities_brand_id ON public.modalities(brand_id);
CREATE INDEX idx_modalities_location_id ON public.modalities(location_id);