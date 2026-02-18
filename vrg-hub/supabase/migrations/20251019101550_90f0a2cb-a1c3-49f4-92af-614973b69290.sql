-- Create table for synced Office 365 users
CREATE TABLE IF NOT EXISTS public.synced_office365_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  user_principal_name TEXT NOT NULL,
  display_name TEXT,
  mail TEXT,
  job_title TEXT,
  department TEXT,
  office_location TEXT,
  assigned_licenses JSONB,
  business_phones JSONB,
  mobile_phone TEXT,
  member_of JSONB,
  is_active BOOLEAN DEFAULT true,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, user_principal_name)
);

-- Create table for synced Office 365 mailboxes
CREATE TABLE IF NOT EXISTS public.synced_office365_mailboxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  mailbox_name TEXT NOT NULL,
  email_address TEXT NOT NULL,
  mailbox_type TEXT DEFAULT 'shared',
  members JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, email_address)
);

-- Enable RLS
ALTER TABLE public.synced_office365_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synced_office365_mailboxes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for synced_office365_users
CREATE POLICY "Admins can manage synced users"
  ON public.synced_office365_users
  FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'tenant_admin'::app_role)
  );

CREATE POLICY "Users can view synced users"
  ON public.synced_office365_users
  FOR SELECT
  USING (true);

-- Create RLS policies for synced_office365_mailboxes
CREATE POLICY "Admins can manage synced mailboxes"
  ON public.synced_office365_mailboxes
  FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'tenant_admin'::app_role)
  );

CREATE POLICY "Users can view synced mailboxes"
  ON public.synced_office365_mailboxes
  FOR SELECT
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_synced_users_company_id ON public.synced_office365_users(company_id);
CREATE INDEX IF NOT EXISTS idx_synced_users_active ON public.synced_office365_users(is_active);
CREATE INDEX IF NOT EXISTS idx_synced_mailboxes_company_id ON public.synced_office365_mailboxes(company_id);

-- Add update trigger for updated_at
CREATE TRIGGER update_synced_office365_users_updated_at
  BEFORE UPDATE ON public.synced_office365_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_synced_office365_mailboxes_updated_at
  BEFORE UPDATE ON public.synced_office365_mailboxes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();