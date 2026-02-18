-- Create enum for granular permissions
CREATE TYPE permission_type AS ENUM (
  'view_requests',
  'create_requests',
  'approve_requests',
  'manage_users',
  'manage_company',
  'manage_catalog',
  'manage_news',
  'manage_newsletter',
  'view_audit_logs',
  'manage_marketing_requests',
  'manage_user_accounts'
);

-- Create user permissions table for individual overrides
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  permission permission_type NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, company_id, permission)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_permissions
CREATE POLICY "Super admins can manage all user permissions"
ON public.user_permissions
FOR ALL
USING (has_global_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Tenant admins can manage their company user permissions"
ON public.user_permissions
FOR ALL
USING (has_role(auth.uid(), company_id, 'tenant_admin'::user_role));

CREATE POLICY "Users can view their own permissions"
ON public.user_permissions
FOR SELECT
USING (user_id = auth.uid());

-- Function to check if user has specific permission (checks both role and user-level)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _company_id uuid, _permission permission_type)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- First check for explicit user permission override
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE user_id = _user_id
        AND company_id = _company_id
        AND permission = _permission
    ) THEN (
      SELECT granted FROM public.user_permissions
      WHERE user_id = _user_id
        AND company_id = _company_id
        AND permission = _permission
      LIMIT 1
    )
    -- Otherwise check role-based permissions
    ELSE (
      SELECT CASE
        WHEN _permission IN ('manage_company', 'manage_users', 'view_audit_logs') THEN
          has_role(_user_id, _company_id, 'tenant_admin'::user_role) OR has_global_role(_user_id, 'super_admin'::user_role)
        WHEN _permission IN ('approve_requests', 'manage_catalog', 'manage_news', 'manage_newsletter') THEN
          has_role(_user_id, _company_id, 'manager'::user_role) OR has_role(_user_id, _company_id, 'tenant_admin'::user_role) OR has_global_role(_user_id, 'super_admin'::user_role)
        WHEN _permission IN ('create_requests', 'view_requests') THEN
          true -- All authenticated users
        ELSE false
      END
    )
  END
$$;

-- Trigger for updated_at
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add validation function to prevent super_admin for non-CrowdIT companies
CREATE OR REPLACE FUNCTION public.validate_super_admin_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_name TEXT;
BEGIN
  -- Only validate if role is super_admin
  IF NEW.role = 'super_admin'::user_role THEN
    -- Get company name
    SELECT name INTO company_name
    FROM public.companies
    WHERE id = NEW.company_id;
    
    -- Only allow super_admin for "Crowd IT" company
    IF company_name != 'Crowd IT' THEN
      RAISE EXCEPTION 'Super admin role can only be assigned to Crowd IT users';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add trigger to user_roles table
CREATE TRIGGER validate_super_admin_before_insert_update
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.validate_super_admin_assignment();