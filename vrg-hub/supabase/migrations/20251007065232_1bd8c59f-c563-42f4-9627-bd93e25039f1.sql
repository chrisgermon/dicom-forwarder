-- Add edit_home_page permission to role_permissions table for managers and admins
-- This allows managers to edit the home page layout without needing full admin access

-- Insert permission for MANAGER role
INSERT INTO role_permissions (company_id, role, permission_key, enabled)
SELECT id, 'manager', 'edit_home_page', true
FROM companies
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions 
  WHERE company_id = companies.id 
  AND role = 'manager' 
  AND permission_key = 'edit_home_page'
);

-- Insert permission for MARKETING_MANAGER role
INSERT INTO role_permissions (company_id, role, permission_key, enabled)
SELECT id, 'marketing_manager', 'edit_home_page', true
FROM companies
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions 
  WHERE company_id = companies.id 
  AND role = 'marketing_manager' 
  AND permission_key = 'edit_home_page'
);

-- Insert permission for TENANT_ADMIN role
INSERT INTO role_permissions (company_id, role, permission_key, enabled)
SELECT id, 'tenant_admin', 'edit_home_page', true
FROM companies
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions 
  WHERE company_id = companies.id 
  AND role = 'tenant_admin' 
  AND permission_key = 'edit_home_page'
);

-- Update seed_company_role_permissions function to include the new permission
CREATE OR REPLACE FUNCTION public.seed_company_role_permissions(_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Clear existing permissions for this company to avoid duplicates
  DELETE FROM role_permissions WHERE company_id = _company_id;
  
  -- REQUESTER ROLE
  -- Basic Access
  INSERT INTO role_permissions (company_id, role, permission_key, enabled) VALUES
    (_company_id, 'requester', 'view_dashboard', true),
    (_company_id, 'requester', 'view_own_requests', true),
    (_company_id, 'requester', 'edit_own_drafts', true);
  
  -- Create Requests
  INSERT INTO role_permissions (company_id, role, permission_key, enabled) VALUES
    (_company_id, 'requester', 'create_hardware_request', true),
    (_company_id, 'requester', 'create_toner_request', true),
    (_company_id, 'requester', 'create_marketing_request', true),
    (_company_id, 'requester', 'create_user_account_request', true);
  
  -- Documentation
  INSERT INTO role_permissions (company_id, role, permission_key, enabled) VALUES
    (_company_id, 'requester', 'view_modality_details', true),
    (_company_id, 'requester', 'view_sharepoint_documents', true),
    (_company_id, 'requester', 'submit_newsletter', true);
  
  -- MARKETING ROLE
  -- Basic Access
  INSERT INTO role_permissions (company_id, role, permission_key, enabled) VALUES
    (_company_id, 'marketing', 'view_dashboard', true),
    (_company_id, 'marketing', 'view_own_requests', true),
    (_company_id, 'marketing', 'edit_own_drafts', true);
  
  -- Create Requests (marketing focused)
  INSERT INTO role_permissions (company_id, role, permission_key, enabled) VALUES
    (_company_id, 'marketing', 'create_marketing_request', true);
  
  -- Documentation
  INSERT INTO role_permissions (company_id, role, permission_key, enabled) VALUES
    (_company_id, 'marketing', 'view_modality_details', true),
    (_company_id, 'marketing', 'view_sharepoint_documents', true),
    (_company_id, 'marketing', 'submit_newsletter', true);
  
  -- MANAGER ROLE
  -- Basic Access
  INSERT INTO role_permissions (company_id, role, permission_key, enabled) VALUES
    (_company_id, 'manager', 'view_dashboard', true),
    (_company_id, 'manager', 'view_own_requests', true),
    (_company_id, 'manager', 'edit_own_drafts', true);
  
  -- Create Requests
  INSERT INTO role_permissions (company_id, role, permission_key, enabled) VALUES
    (_company_id, 'manager', 'create_hardware_request', true),
    (_company_id, 'manager', 'create_toner_request', true),
    (_company_id, 'manager', 'create_marketing_request', true),
    (_company_id, 'manager', 'create_user_account_request', true);
  
  -- Approvals
  INSERT INTO role_permissions (company_id, role, permission_key, enabled) VALUES
    (_company_id, 'manager', 'approve_hardware_requests', true),
    (_company_id, 'manager', 'approve_user_account_requests', true);
  
  -- Management
  INSERT INTO role_permissions (company_id, role, permission_key, enabled) VALUES
    (_company_id, 'manager', 'view_all_company_requests', true),
    (_company_id, 'manager', 'view_request_metrics', true),
    (_company_id, 'manager', 'edit_home_page', true);
  
  -- Documentation
  INSERT INTO role_permissions (company_id, role, permission_key, enabled) VALUES
    (_company_id, 'manager', 'view_modality_details', true),
    (_company_id, 'manager', 'view_sharepoint_documents', true),
    (_company_id, 'manager', 'submit_newsletter', true);
  
  -- MARKETING MANAGER ROLE
  -- Basic Access
  INSERT INTO role_permissions (company_id, role, permission_key, enabled) VALUES
    (_company_id, 'marketing_manager', 'view_dashboard', true),
    (_company_id, 'marketing_manager', 'view_own_requests', true),
    (_company_id, 'marketing_manager', 'edit_own_drafts', true);
  
  -- Create Requests
  INSERT INTO role_permissions (company_id, role, permission_key, enabled) VALUES
    (_company_id, 'marketing_manager', 'create_hardware_request', true),
    (_company_id, 'marketing_manager', 'create_toner_request', true),
    (_company_id, 'marketing_manager', 'create_marketing_request', true),
    (_company_id, 'marketing_manager', 'create_user_account_request', true);
  
  -- Approvals
  INSERT INTO role_permissions (company_id, role, permission_key, enabled) VALUES
    (_company_id, 'marketing_manager', 'approve_marketing_requests', true),
    (_company_id, 'marketing_manager', 'approve_newsletter_submissions', true);
  
  -- Management
  INSERT INTO role_permissions (company_id, role, permission_key, enabled) VALUES
    (_company_id, 'marketing_manager', 'manage_newsletter_cycle', true),
    (_company_id, 'marketing_manager', 'view_all_company_requests', true),
    (_company_id, 'marketing_manager', 'view_request_metrics', true),
    (_company_id, 'marketing_manager', 'edit_home_page', true);
  
  -- Documentation
  INSERT INTO role_permissions (company_id, role, permission_key, enabled) VALUES
    (_company_id, 'marketing_manager', 'view_modality_details', true),
    (_company_id, 'marketing_manager', 'view_sharepoint_documents', true),
    (_company_id, 'marketing_manager', 'submit_newsletter', true),
    (_company_id, 'marketing_manager', 'edit_knowledge_base', true);
  
  -- TENANT ADMIN ROLE
  -- Basic Access
  INSERT INTO role_permissions (company_id, role, permission_key, enabled) VALUES
    (_company_id, 'tenant_admin', 'view_dashboard', true),
    (_company_id, 'tenant_admin', 'view_own_requests', true),
    (_company_id, 'tenant_admin', 'edit_own_drafts', true);
  
  -- Create Requests
  INSERT INTO role_permissions (company_id, role, permission_key, enabled) VALUES
    (_company_id, 'tenant_admin', 'create_hardware_request', true),
    (_company_id, 'tenant_admin', 'create_toner_request', true),
    (_company_id, 'tenant_admin', 'create_marketing_request', true),
    (_company_id, 'tenant_admin', 'create_user_account_request', true);
  
  -- Approvals (all)
  INSERT INTO role_permissions (company_id, role, permission_key, enabled) VALUES
    (_company_id, 'tenant_admin', 'approve_hardware_requests', true),
    (_company_id, 'tenant_admin', 'approve_marketing_requests', true),
    (_company_id, 'tenant_admin', 'approve_user_account_requests', true),
    (_company_id, 'tenant_admin', 'approve_newsletter_submissions', true);
  
  -- Management (all)
  INSERT INTO role_permissions (company_id, role, permission_key, enabled) VALUES
    (_company_id, 'tenant_admin', 'manage_company_users', true),
    (_company_id, 'tenant_admin', 'manage_hardware_catalog', true),
    (_company_id, 'tenant_admin', 'manage_newsletter_cycle', true),
    (_company_id, 'tenant_admin', 'view_all_company_requests', true),
    (_company_id, 'tenant_admin', 'view_request_metrics', true),
    (_company_id, 'tenant_admin', 'edit_home_page', true);
  
  -- Configuration (all)
  INSERT INTO role_permissions (company_id, role, permission_key, enabled) VALUES
    (_company_id, 'tenant_admin', 'configure_company_settings', true),
    (_company_id, 'tenant_admin', 'manage_company_features', true),
    (_company_id, 'tenant_admin', 'manage_office365_integration', true),
    (_company_id, 'tenant_admin', 'configure_sharepoint', true);
  
  -- Documentation (all)
  INSERT INTO role_permissions (company_id, role, permission_key, enabled) VALUES
    (_company_id, 'tenant_admin', 'view_modality_details', true),
    (_company_id, 'tenant_admin', 'view_sharepoint_documents', true),
    (_company_id, 'tenant_admin', 'submit_newsletter', true),
    (_company_id, 'tenant_admin', 'manage_knowledge_base', true),
    (_company_id, 'tenant_admin', 'edit_knowledge_base', true),
    (_company_id, 'tenant_admin', 'delete_knowledge_base', true);
END;
$function$;