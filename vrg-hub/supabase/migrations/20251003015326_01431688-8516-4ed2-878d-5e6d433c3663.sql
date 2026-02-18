-- Create table to store Office 365 tenant connections
CREATE TABLE public.office365_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  connected_by UUID NOT NULL,
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.office365_connections ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Super admins can manage all connections"
ON public.office365_connections
FOR ALL
USING (has_global_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tenant admins can manage their connection"
ON public.office365_connections
FOR ALL
USING (has_role(auth.uid(), company_id, 'tenant_admin'));

CREATE POLICY "Tenant admins can view their connection"
ON public.office365_connections
FOR SELECT
USING (has_role(auth.uid(), company_id, 'tenant_admin'));

-- Create synced users table
CREATE TABLE public.synced_office365_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_principal_name TEXT NOT NULL,
  display_name TEXT,
  mail TEXT,
  job_title TEXT,
  department TEXT,
  office_location TEXT,
  assigned_licenses JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_principal_name)
);

-- Enable RLS
ALTER TABLE public.synced_office365_users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Super admins can view all synced users"
ON public.synced_office365_users
FOR SELECT
USING (has_global_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tenant admins can view their synced users"
ON public.synced_office365_users
FOR SELECT
USING (has_role(auth.uid(), company_id, 'tenant_admin'));

-- Create synced shared mailboxes table
CREATE TABLE public.synced_office365_mailboxes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  mailbox_name TEXT NOT NULL,
  email_address TEXT NOT NULL,
  mailbox_type TEXT,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, email_address)
);

-- Enable RLS
ALTER TABLE public.synced_office365_mailboxes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Super admins can view all synced mailboxes"
ON public.synced_office365_mailboxes
FOR SELECT
USING (has_global_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tenant admins can view their synced mailboxes"
ON public.synced_office365_mailboxes
FOR SELECT
USING (has_role(auth.uid(), company_id, 'tenant_admin'));