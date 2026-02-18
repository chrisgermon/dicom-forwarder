-- Create request categories table
CREATE TABLE public.request_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type_id UUID NOT NULL REFERENCES public.request_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(request_type_id, slug)
);

-- Enable RLS
ALTER TABLE public.request_categories ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view active categories
CREATE POLICY "Everyone can view active categories"
ON public.request_categories
FOR SELECT
USING (is_active = true);

-- Admins can manage categories
CREATE POLICY "Admins can manage categories"
ON public.request_categories
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'tenant_admin'::app_role)
);

-- Seed Facility Services categories
INSERT INTO public.request_categories (request_type_id, name, slug, description, icon, sort_order)
SELECT 
  id,
  'General Maintenance',
  'general-maintenance',
  'General building and facility maintenance',
  'wrench',
  1
FROM public.request_types 
WHERE slug = 'facility-services';

INSERT INTO public.request_categories (request_type_id, name, slug, description, icon, sort_order)
SELECT 
  id,
  'Airconditioning',
  'airconditioning',
  'HVAC and climate control systems',
  'air-vent',
  2
FROM public.request_types 
WHERE slug = 'facility-services';

INSERT INTO public.request_categories (request_type_id, name, slug, description, icon, sort_order)
SELECT 
  id,
  'Lighting',
  'lighting',
  'Lighting systems and fixtures',
  'lightbulb',
  3
FROM public.request_types 
WHERE slug = 'facility-services';

INSERT INTO public.request_categories (request_type_id, name, slug, description, icon, sort_order)
SELECT 
  id,
  'Cleaning',
  'cleaning',
  'Cleaning and janitorial services',
  'sparkles',
  4
FROM public.request_types 
WHERE slug = 'facility-services';

INSERT INTO public.request_categories (request_type_id, name, slug, description, icon, sort_order)
SELECT 
  id,
  'Merchandise',
  'merchandise',
  'Merchandising and display',
  'package',
  5
FROM public.request_types 
WHERE slug = 'facility-services';

INSERT INTO public.request_categories (request_type_id, name, slug, description, icon, sort_order)
SELECT 
  id,
  'Other',
  'other',
  'Other facility services',
  'help-circle',
  6
FROM public.request_types 
WHERE slug = 'facility-services';