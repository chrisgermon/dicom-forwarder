-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Public can view shared clinic configs" ON public.clinic_network_configs;
DROP POLICY IF EXISTS "Public can view shared DICOM servers" ON public.dicom_servers;
DROP POLICY IF EXISTS "Public can view shared DICOM modalities" ON public.dicom_modalities;

-- Create security definer functions to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.is_clinic_publicly_shared(_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_shared_links
    WHERE clinic_network_config_id = _clinic_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Recreate policies using the security definer function
CREATE POLICY "Public can view shared clinic configs"
ON public.clinic_network_configs
FOR SELECT
USING (is_clinic_publicly_shared(id));

CREATE POLICY "Public can view shared DICOM servers"
ON public.dicom_servers
FOR SELECT
USING (is_clinic_publicly_shared(clinic_network_config_id));

CREATE POLICY "Public can view shared DICOM modalities"
ON public.dicom_modalities
FOR SELECT
USING (is_clinic_publicly_shared(clinic_network_config_id));