-- Create brands table
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create locations table with brand association
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(brand_id, name)
);

-- Add brand_id and location_id to hardware_requests
ALTER TABLE public.hardware_requests 
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id),
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id);

-- Add brand_id and location_id to marketing_requests
ALTER TABLE public.marketing_requests 
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id),
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id);

-- Enable RLS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Brands RLS Policies
CREATE POLICY "Everyone can view active brands"
ON public.brands
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage brands"
ON public.brands
FOR ALL
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Locations RLS Policies
CREATE POLICY "Everyone can view active locations"
ON public.locations
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage locations"
ON public.locations
FOR ALL
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Add updated_at triggers
CREATE TRIGGER update_brands_updated_at
BEFORE UPDATE ON public.brands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default brands
INSERT INTO public.brands (name, display_name, description, sort_order) VALUES
('vision_radiology', 'Vision Radiology', 'Vision Radiology brand', 1),
('quantum_medical_imaging', 'Quantum Medical Imaging', 'Quantum Medical Imaging brand', 2),
('light_radiology', 'Light Radiology', 'Light Radiology brand', 3),
('focus_radiology', 'Focus Radiology', 'Focus Radiology brand', 4)
ON CONFLICT (name) DO NOTHING;