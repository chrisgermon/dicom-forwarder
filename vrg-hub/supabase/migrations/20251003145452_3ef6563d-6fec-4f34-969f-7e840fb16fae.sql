-- Create role_permissions table for granular permission management
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  permission_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE(role, permission_key)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all role permissions
CREATE POLICY "Super admins can manage all role permissions"
ON public.role_permissions
FOR ALL
USING (has_global_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Create updated_at trigger
CREATE TRIGGER update_role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default permissions for all roles
INSERT INTO public.role_permissions (role, permission_key, enabled) VALUES
  -- Requester permissions
  ('requester', 'view_dashboard', true),
  ('requester', 'create_hardware_request', true),
  ('requester', 'create_toner_request', true),
  ('requester', 'create_marketing_request', true),
  ('requester', 'create_user_account_request', true),
  ('requester', 'view_own_requests', true),
  ('requester', 'edit_own_drafts', true),
  ('requester', 'view_modality_details', true),
  ('requester', 'view_sharepoint_documents', true),
  ('requester', 'submit_newsletter', true),
  
  -- Manager permissions (includes all requester permissions)
  ('manager', 'view_dashboard', true),
  ('manager', 'create_hardware_request', true),
  ('manager', 'create_toner_request', true),
  ('manager', 'create_marketing_request', true),
  ('manager', 'create_user_account_request', true),
  ('manager', 'view_own_requests', true),
  ('manager', 'edit_own_drafts', true),
  ('manager', 'view_modality_details', true),
  ('manager', 'view_sharepoint_documents', true),
  ('manager', 'submit_newsletter', true),
  ('manager', 'approve_hardware_requests', true),
  ('manager', 'approve_marketing_requests', true),
  ('manager', 'approve_user_account_requests', true),
  ('manager', 'view_all_company_requests', true),
  ('manager', 'manage_newsletter_cycle', true),
  ('manager', 'approve_newsletter_submissions', true),
  ('manager', 'view_request_metrics', true),
  
  -- Tenant Admin permissions (includes manager permissions)
  ('tenant_admin', 'view_dashboard', true),
  ('tenant_admin', 'create_hardware_request', true),
  ('tenant_admin', 'create_toner_request', true),
  ('tenant_admin', 'create_marketing_request', true),
  ('tenant_admin', 'create_user_account_request', true),
  ('tenant_admin', 'view_own_requests', true),
  ('tenant_admin', 'edit_own_drafts', true),
  ('tenant_admin', 'view_modality_details', true),
  ('tenant_admin', 'view_sharepoint_documents', true),
  ('tenant_admin', 'submit_newsletter', true),
  ('tenant_admin', 'approve_hardware_requests', true),
  ('tenant_admin', 'approve_marketing_requests', true),
  ('tenant_admin', 'approve_user_account_requests', true),
  ('tenant_admin', 'view_all_company_requests', true),
  ('tenant_admin', 'manage_newsletter_cycle', true),
  ('tenant_admin', 'approve_newsletter_submissions', true),
  ('tenant_admin', 'view_request_metrics', true),
  ('tenant_admin', 'manage_company_users', true),
  ('tenant_admin', 'manage_hardware_catalog', true),
  ('tenant_admin', 'configure_company_settings', true),
  ('tenant_admin', 'manage_company_features', true),
  ('tenant_admin', 'manage_office365_integration', true),
  ('tenant_admin', 'configure_sharepoint', true),
  
  -- Super Admin permissions (all permissions)
  ('super_admin', 'view_dashboard', true),
  ('super_admin', 'create_hardware_request', true),
  ('super_admin', 'create_toner_request', true),
  ('super_admin', 'create_marketing_request', true),
  ('super_admin', 'create_user_account_request', true),
  ('super_admin', 'view_own_requests', true),
  ('super_admin', 'edit_own_drafts', true),
  ('super_admin', 'view_modality_details', true),
  ('super_admin', 'view_sharepoint_documents', true),
  ('super_admin', 'submit_newsletter', true),
  ('super_admin', 'approve_hardware_requests', true),
  ('super_admin', 'approve_marketing_requests', true),
  ('super_admin', 'approve_user_account_requests', true),
  ('super_admin', 'view_all_company_requests', true),
  ('super_admin', 'manage_newsletter_cycle', true),
  ('super_admin', 'approve_newsletter_submissions', true),
  ('super_admin', 'view_request_metrics', true),
  ('super_admin', 'manage_company_users', true),
  ('super_admin', 'manage_hardware_catalog', true),
  ('super_admin', 'configure_company_settings', true),
  ('super_admin', 'manage_company_features', true),
  ('super_admin', 'manage_office365_integration', true),
  ('super_admin', 'configure_sharepoint', true),
  ('super_admin', 'manage_all_companies', true),
  ('super_admin', 'manage_system_users', true),
  ('super_admin', 'view_audit_logs', true),
  ('super_admin', 'manage_file_storage', true),
  ('super_admin', 'manage_user_invites', true),
  ('super_admin', 'manage_role_permissions', true),
  ('super_admin', 'view_system_metrics', true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- Add comment
COMMENT ON TABLE public.role_permissions IS 'Stores granular permissions for each user role';