-- Create clinic network configuration table
CREATE TABLE public.clinic_network_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  ip_range TEXT,
  gateway TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create DICOM servers table
CREATE TABLE public.dicom_servers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_network_config_id UUID NOT NULL REFERENCES public.clinic_network_configs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  ae_title TEXT,
  port INTEGER,
  function TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create DICOM modalities table
CREATE TABLE public.dicom_modalities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_network_config_id UUID NOT NULL REFERENCES public.clinic_network_configs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  ae_title TEXT,
  port INTEGER,
  worklist_ip_address TEXT,
  worklist_ae_title TEXT,
  worklist_port INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clinic_network_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dicom_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dicom_modalities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clinic_network_configs
CREATE POLICY "Users can view their company's clinic configs"
  ON public.clinic_network_configs FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Tenant admins can manage their clinic configs"
  ON public.clinic_network_configs FOR ALL
  USING (has_role(auth.uid(), company_id, 'tenant_admin'::user_role));

CREATE POLICY "Super admins can manage all clinic configs"
  ON public.clinic_network_configs FOR ALL
  USING (has_global_role(auth.uid(), 'super_admin'::user_role));

-- RLS Policies for dicom_servers
CREATE POLICY "Users can view their company's DICOM servers"
  ON public.dicom_servers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.clinic_network_configs cnc
    WHERE cnc.id = dicom_servers.clinic_network_config_id
    AND cnc.company_id = get_user_company(auth.uid())
  ));

CREATE POLICY "Tenant admins can manage their DICOM servers"
  ON public.dicom_servers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.clinic_network_configs cnc
    WHERE cnc.id = dicom_servers.clinic_network_config_id
    AND has_role(auth.uid(), cnc.company_id, 'tenant_admin'::user_role)
  ));

CREATE POLICY "Super admins can manage all DICOM servers"
  ON public.dicom_servers FOR ALL
  USING (has_global_role(auth.uid(), 'super_admin'::user_role));

-- RLS Policies for dicom_modalities
CREATE POLICY "Users can view their company's DICOM modalities"
  ON public.dicom_modalities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.clinic_network_configs cnc
    WHERE cnc.id = dicom_modalities.clinic_network_config_id
    AND cnc.company_id = get_user_company(auth.uid())
  ));

CREATE POLICY "Tenant admins can manage their DICOM modalities"
  ON public.dicom_modalities FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.clinic_network_configs cnc
    WHERE cnc.id = dicom_modalities.clinic_network_config_id
    AND has_role(auth.uid(), cnc.company_id, 'tenant_admin'::user_role)
  ));

CREATE POLICY "Super admins can manage all DICOM modalities"
  ON public.dicom_modalities FOR ALL
  USING (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Add trigger for updated_at
CREATE TRIGGER update_clinic_network_configs_updated_at
  BEFORE UPDATE ON public.clinic_network_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better search performance
CREATE INDEX idx_clinic_network_configs_company_id ON public.clinic_network_configs(company_id);
CREATE INDEX idx_clinic_network_configs_location_name ON public.clinic_network_configs(location_name);
CREATE INDEX idx_dicom_servers_clinic_config_id ON public.dicom_servers(clinic_network_config_id);
CREATE INDEX idx_dicom_servers_name ON public.dicom_servers(name);
CREATE INDEX idx_dicom_modalities_clinic_config_id ON public.dicom_modalities(clinic_network_config_id);
CREATE INDEX idx_dicom_modalities_name ON public.dicom_modalities(name);