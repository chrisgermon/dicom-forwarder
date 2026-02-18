-- Create directory clinics table
CREATE TABLE public.directory_clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  fax TEXT,
  region TEXT NOT NULL CHECK (region IN ('melbourne', 'regional')),
  extensions JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create directory contacts table
CREATE TABLE public.directory_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('admin', 'marketing')),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.directory_clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directory_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for directory_clinics
CREATE POLICY "Everyone can view active clinics"
  ON public.directory_clinics
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage clinics"
  ON public.directory_clinics
  FOR ALL
  USING (has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for directory_contacts
CREATE POLICY "Everyone can view active contacts"
  ON public.directory_contacts
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage contacts"
  ON public.directory_contacts
  FOR ALL
  USING (has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Create indexes
CREATE INDEX idx_directory_clinics_brand ON public.directory_clinics(brand_id);
CREATE INDEX idx_directory_clinics_region ON public.directory_clinics(region);
CREATE INDEX idx_directory_contacts_brand ON public.directory_contacts(brand_id);
CREATE INDEX idx_directory_contacts_type ON public.directory_contacts(contact_type);

-- Trigger for updated_at
CREATE TRIGGER update_directory_clinics_updated_at
  BEFORE UPDATE ON public.directory_clinics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_directory_contacts_updated_at
  BEFORE UPDATE ON public.directory_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();