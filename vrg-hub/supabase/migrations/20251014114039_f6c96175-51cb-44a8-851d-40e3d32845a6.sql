-- Create company domains table
CREATE TABLE public.company_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  is_verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  verified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create print brands table
CREATE TABLE public.print_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create canned responses table
CREATE TABLE public.canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_domains
CREATE POLICY "Admins can manage company domains"
  ON public.company_domains FOR ALL
  USING (has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Anyone can view active domains"
  ON public.company_domains FOR SELECT
  USING (is_active = true);

-- RLS Policies for print_brands
CREATE POLICY "Admins can manage print brands"
  ON public.print_brands FOR ALL
  USING (has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Everyone can view active print brands"
  ON public.print_brands FOR SELECT
  USING (is_active = true);

-- RLS Policies for canned_responses
CREATE POLICY "Admins can manage canned responses"
  ON public.canned_responses FOR ALL
  USING (has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Users can view active canned responses"
  ON public.canned_responses FOR SELECT
  USING (is_active = true);

-- Create triggers for updated_at
CREATE TRIGGER update_company_domains_updated_at
  BEFORE UPDATE ON public.company_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_print_brands_updated_at
  BEFORE UPDATE ON public.print_brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_canned_responses_updated_at
  BEFORE UPDATE ON public.canned_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_company_domains_domain ON public.company_domains(domain);
CREATE INDEX idx_company_domains_active ON public.company_domains(is_active);
CREATE INDEX idx_print_brands_active ON public.print_brands(is_active);
CREATE INDEX idx_canned_responses_category ON public.canned_responses(category);
CREATE INDEX idx_canned_responses_active ON public.canned_responses(is_active);