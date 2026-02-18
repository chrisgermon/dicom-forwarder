-- Create external_providers table
CREATE TABLE IF NOT EXISTS public.external_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.external_providers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view active external providers"
  ON public.external_providers
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage external providers"
  ON public.external_providers
  FOR ALL
  USING (
    has_role(auth.uid(), 'tenant_admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Add updated_at trigger
CREATE TRIGGER update_external_providers_updated_at
  BEFORE UPDATE ON public.external_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Phone Directory data for Vision Radiology
INSERT INTO public.directory_clinics (brand_id, name, phone, address, fax, region, extensions, sort_order)
SELECT 
  (SELECT id FROM brands WHERE name = 'vr'),
  name, phone, address, fax, region::text, extensions::jsonb, sort_order
FROM (VALUES
  ('Bundoora', '03 9496 9777', '1397 Plenty Road, Bundoora VIC 3083', '03 9496 9778', 'melbourne', '[{"name":"Bookings","extension":"111"},{"name":"Reception","extension":"112"}]'::jsonb, 1),
  ('Epping', '03 9408 9777', 'Shop 5, 571-583 High Street, Epping VIC 3076', '03 9408 9778', 'melbourne', '[{"name":"Bookings","extension":"111"}]'::jsonb, 2),
  ('Greensborough', '03 9432 9777', 'Suite 9, 1 Flintoff Street, Greensborough VIC 3088', '03 9432 9778', 'melbourne', '[{"name":"Bookings","extension":"111"}]'::jsonb, 3),
  ('Heidelberg', '03 9496 9888', '85 Burgundy Street, Heidelberg VIC 3084', '03 9496 9889', 'melbourne', '[{"name":"Bookings","extension":"111"}]'::jsonb, 4),
  ('Preston', '03 9496 9666', '363-365 High Street, Preston VIC 3072', '03 9496 9667', 'melbourne', '[{"name":"Bookings","extension":"111"}]'::jsonb, 5),
  ('Reservoir', '03 9462 9777', '1385 Plenty Road, Reservoir VIC 3073', '03 9462 9778', 'melbourne', '[{"name":"Bookings","extension":"111"}]'::jsonb, 6),
  ('Bendigo', '03 5441 5333', '163 Barnard Street, Bendigo VIC 3550', '03 5441 7390', 'regional', '[{"name":"Bookings","extension":"111"}]'::jsonb, 7),
  ('Echuca', '03 5480 0888', '224 Annesley Street, Echuca VIC 3564', '03 5480 2268', 'regional', '[{"name":"Bookings","extension":"111"}]'::jsonb, 8),
  ('Shepparton', '03 5831 2144', '182 Welsford Street, Shepparton VIC 3630', '03 5831 4257', 'regional', '[{"name":"Bookings","extension":"111"}]'::jsonb, 9)
) AS t(name, phone, address, fax, region, extensions, sort_order);

-- Seed contacts for Vision Radiology
INSERT INTO public.directory_contacts (brand_id, name, title, phone, email, contact_type, sort_order)
SELECT 
  (SELECT id FROM brands WHERE name = 'vr'),
  name, title, phone, email, contact_type::text, sort_order
FROM (VALUES
  ('Admin Team', 'Administration', '03 9496 9777', 'admin@visionradiology.com.au', 'admin', 1),
  ('IT Support', 'Technical Support', '03 9496 9777', 'itsupport@visionradiology.com.au', 'admin', 2),
  ('Marketing Team', 'Marketing Department', '03 9496 9777', 'marketing@visionradiology.com.au', 'marketing', 3),
  ('Referrer Liaison', 'Referrer Services', '03 9496 9777', 'referrers@visionradiology.com.au', 'marketing', 4)
) AS t(name, title, phone, email, contact_type, sort_order);

-- Seed External Providers for Vision Radiology
INSERT INTO public.external_providers (brand_id, name, category, url, sort_order)
SELECT 
  (SELECT id FROM brands WHERE name = 'vr'),
  name, category, url, sort_order
FROM (VALUES
  ('GV Health', 'Shepparton Region', 'https://www.gvhealth.org.au/', 1),
  ('Keystone Radiology/Sovereign', 'Shepparton Region', 'https://www.keystoneradiology.com.au/', 2),
  ('Regional Imaging, I-MED', 'Shepparton Region', 'https://www.regionalimaging.com.au/', 3)
) AS t(name, category, url, sort_order);