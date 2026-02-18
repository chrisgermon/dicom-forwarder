-- Add brand_id and location_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id),
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id);

-- Add brand_id to department_assignments
ALTER TABLE public.department_assignments
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_locations_brand_id ON public.locations(brand_id);
CREATE INDEX IF NOT EXISTS idx_profiles_brand_id ON public.profiles(brand_id);
CREATE INDEX IF NOT EXISTS idx_profiles_location_id ON public.profiles(location_id);
CREATE INDEX IF NOT EXISTS idx_hardware_requests_brand_id ON public.hardware_requests(brand_id);
CREATE INDEX IF NOT EXISTS idx_hardware_requests_location_id ON public.hardware_requests(location_id);
CREATE INDEX IF NOT EXISTS idx_marketing_requests_brand_id ON public.marketing_requests(brand_id);
CREATE INDEX IF NOT EXISTS idx_marketing_requests_location_id ON public.marketing_requests(location_id);