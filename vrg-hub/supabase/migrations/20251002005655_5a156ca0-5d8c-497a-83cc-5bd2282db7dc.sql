-- Create table for shared clinic links
CREATE TABLE public.clinic_shared_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_network_config_id UUID NOT NULL REFERENCES public.clinic_network_configs(id) ON DELETE CASCADE,
  share_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.clinic_shared_links ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create share links for their company's clinics
CREATE POLICY "Users can create share links for their clinics"
ON public.clinic_shared_links
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clinic_network_configs cnc
    WHERE cnc.id = clinic_network_config_id
    AND cnc.company_id = get_user_company(auth.uid())
  )
);

-- Policy: Users can view their company's share links
CREATE POLICY "Users can view their company's share links"
ON public.clinic_shared_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clinic_network_configs cnc
    WHERE cnc.id = clinic_network_config_id
    AND cnc.company_id = get_user_company(auth.uid())
  )
);

-- Policy: Users can delete their company's share links
CREATE POLICY "Users can delete their company's share links"
ON public.clinic_shared_links
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.clinic_network_configs cnc
    WHERE cnc.id = clinic_network_config_id
    AND cnc.company_id = get_user_company(auth.uid())
  )
);

-- Policy: Public can view active, non-expired share links
CREATE POLICY "Public can view valid share links"
ON public.clinic_shared_links
FOR SELECT
USING (
  is_active = true
  AND (expires_at IS NULL OR expires_at > now())
);

-- Policy: Public can view clinic details via valid share token
CREATE POLICY "Public can view shared clinic configs"
ON public.clinic_network_configs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clinic_shared_links csl
    WHERE csl.clinic_network_config_id = clinic_network_configs.id
    AND csl.is_active = true
    AND (csl.expires_at IS NULL OR csl.expires_at > now())
  )
);

-- Policy: Public can view DICOM servers via valid share token
CREATE POLICY "Public can view shared DICOM servers"
ON public.dicom_servers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clinic_shared_links csl
    WHERE csl.clinic_network_config_id = dicom_servers.clinic_network_config_id
    AND csl.is_active = true
    AND (csl.expires_at IS NULL OR csl.expires_at > now())
  )
);

-- Policy: Public can view DICOM modalities via valid share token
CREATE POLICY "Public can view shared DICOM modalities"
ON public.dicom_modalities
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clinic_shared_links csl
    WHERE csl.clinic_network_config_id = dicom_modalities.clinic_network_config_id
    AND csl.is_active = true
    AND (csl.expires_at IS NULL OR csl.expires_at > now())
  )
);

-- Create index for faster lookups
CREATE INDEX idx_clinic_shared_links_token ON public.clinic_shared_links(share_token);
CREATE INDEX idx_clinic_shared_links_clinic ON public.clinic_shared_links(clinic_network_config_id);