-- Create table for HaloPSA integration settings
CREATE TABLE public.halo_integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  halo_client_id INTEGER NOT NULL,
  halo_client_name TEXT NOT NULL,
  halo_site_id INTEGER,
  halo_site_name TEXT,
  halo_default_user_id INTEGER,
  halo_default_user_name TEXT,
  auto_create_users BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.halo_integration_settings ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all settings
CREATE POLICY "Super admins can manage all halo settings"
ON public.halo_integration_settings
FOR ALL
TO authenticated
USING (has_global_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Tenant admins can manage their company settings
CREATE POLICY "Tenant admins can manage their company halo settings"
ON public.halo_integration_settings
FOR ALL
TO authenticated
USING (
  company_id = get_user_company(auth.uid()) AND
  has_role(auth.uid(), company_id, 'tenant_admin'::user_role)
)
WITH CHECK (
  company_id = get_user_company(auth.uid()) AND
  has_role(auth.uid(), company_id, 'tenant_admin'::user_role)
);

-- Users can view their company settings
CREATE POLICY "Users can view their company halo settings"
ON public.halo_integration_settings
FOR SELECT
TO authenticated
USING (company_id = get_user_company(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_halo_integration_settings_updated_at
BEFORE UPDATE ON public.halo_integration_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_halo_integration_company ON public.halo_integration_settings(company_id);