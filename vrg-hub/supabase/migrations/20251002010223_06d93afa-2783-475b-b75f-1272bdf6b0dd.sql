-- Create security definer function to check if user can view a clinic
-- This prevents infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.can_user_view_clinic(_clinic_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_network_configs cnc
    WHERE cnc.id = _clinic_id
      AND cnc.company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = _user_id
      )
  )
$$;

-- Drop and recreate the problematic policies using the security definer function
DROP POLICY IF EXISTS "Users can view their company's DICOM servers" ON public.dicom_servers;
DROP POLICY IF EXISTS "Users can view their company's DICOM modalities" ON public.dicom_modalities;
DROP POLICY IF EXISTS "Tenant admins can manage their DICOM servers" ON public.dicom_servers;
DROP POLICY IF EXISTS "Tenant admins can manage their DICOM modalities" ON public.dicom_modalities;

-- Recreate policies without subqueries that cause recursion
CREATE POLICY "Users can view their company's DICOM servers"
ON public.dicom_servers
FOR SELECT
USING (
  can_user_view_clinic(clinic_network_config_id, auth.uid())
  OR is_clinic_publicly_shared(clinic_network_config_id)
);

CREATE POLICY "Users can view their company's DICOM modalities"
ON public.dicom_modalities
FOR SELECT
USING (
  can_user_view_clinic(clinic_network_config_id, auth.uid())
  OR is_clinic_publicly_shared(clinic_network_config_id)
);

CREATE POLICY "Tenant admins can manage their DICOM servers"
ON public.dicom_servers
FOR ALL
USING (can_user_view_clinic(clinic_network_config_id, auth.uid()));

CREATE POLICY "Tenant admins can manage their DICOM modalities"
ON public.dicom_modalities
FOR ALL
USING (can_user_view_clinic(clinic_network_config_id, auth.uid()));