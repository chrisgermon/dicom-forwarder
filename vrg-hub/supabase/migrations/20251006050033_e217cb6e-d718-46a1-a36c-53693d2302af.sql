-- Create company_locations table
CREATE TABLE public.company_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company locations"
  ON public.company_locations
  FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Tenant admins can manage their company locations"
  ON public.company_locations
  FOR ALL
  USING (
    company_id = get_user_company(auth.uid()) 
    AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role)
  )
  WITH CHECK (
    company_id = get_user_company(auth.uid()) 
    AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role)
  );

CREATE POLICY "Super admins can manage all locations"
  ON public.company_locations
  FOR ALL
  USING (has_global_role(auth.uid(), 'super_admin'::user_role))
  WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Add trigger for updated_at
CREATE TRIGGER update_company_locations_updated_at
  BEFORE UPDATE ON public.company_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_company_locations_company_id ON public.company_locations(company_id);
CREATE INDEX idx_company_locations_active ON public.company_locations(is_active) WHERE is_active = true;