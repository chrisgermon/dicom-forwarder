-- Add SharePoint configuration table
CREATE TABLE public.sharepoint_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_url TEXT NOT NULL,
  site_id TEXT,
  drive_id TEXT,
  folder_path TEXT DEFAULT '/',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.sharepoint_configurations ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all configurations
CREATE POLICY "Super admins can manage all SharePoint configs"
ON public.sharepoint_configurations
FOR ALL
USING (has_global_role(auth.uid(), 'super_admin'));

-- Tenant admins can manage their company configurations
CREATE POLICY "Tenant admins can manage their SharePoint configs"
ON public.sharepoint_configurations
FOR ALL
USING (
  company_id = get_user_company(auth.uid()) 
  AND has_role(auth.uid(), company_id, 'tenant_admin')
);

-- Users can view their company configurations
CREATE POLICY "Users can view their company SharePoint configs"
ON public.sharepoint_configurations
FOR SELECT
USING (
  is_active = true 
  AND company_id = get_user_company(auth.uid())
);

-- Add trigger for updated_at
CREATE TRIGGER update_sharepoint_configurations_updated_at
BEFORE UPDATE ON public.sharepoint_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();