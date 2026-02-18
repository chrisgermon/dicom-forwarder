
-- Create office365_connections table to store user O365 tokens
CREATE TABLE IF NOT EXISTS public.office365_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Create sharepoint_configurations table for company SharePoint settings
CREATE TABLE IF NOT EXISTS public.sharepoint_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  site_id TEXT,
  site_url TEXT,
  folder_path TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.office365_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharepoint_configurations ENABLE ROW LEVEL SECURITY;

-- RLS policies for office365_connections
CREATE POLICY "Users can view their own Office 365 connections"
  ON public.office365_connections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Office 365 connections"
  ON public.office365_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Office 365 connections"
  ON public.office365_connections
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all Office 365 connections"
  ON public.office365_connections
  FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'tenant_admin'::app_role)
  );

-- RLS policies for sharepoint_configurations
CREATE POLICY "Authenticated users can view SharePoint configurations"
  ON public.sharepoint_configurations
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage SharePoint configurations"
  ON public.sharepoint_configurations
  FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'tenant_admin'::app_role)
  );

-- Add trigger for updated_at
CREATE TRIGGER update_office365_connections_updated_at
  BEFORE UPDATE ON public.office365_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sharepoint_configurations_updated_at
  BEFORE UPDATE ON public.sharepoint_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_office365_connections_user_id ON public.office365_connections(user_id);
CREATE INDEX idx_office365_connections_company_id ON public.office365_connections(company_id);
CREATE INDEX idx_sharepoint_configurations_company_id ON public.sharepoint_configurations(company_id);
