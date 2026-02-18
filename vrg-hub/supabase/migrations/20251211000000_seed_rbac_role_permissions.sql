-- Seed RBAC roles and their default permissions
-- This migration sets up the default role-permission mappings for the RBAC system

-- =============================================
-- 1. SEED DEFAULT ROLES
-- =============================================

INSERT INTO rbac_roles (name, description, is_system_role) VALUES
  ('requester', 'Default role for regular users. Can create and track their own requests.', true),
  ('marketing', 'Marketing team member. Can submit and collaborate on marketing requests.', true),
  ('manager', 'Manager role. Can approve requests and oversee team activities.', true),
  ('marketing_manager', 'Marketing Manager. Can coordinate company-wide marketing initiatives.', true),
  ('tenant_admin', 'Tenant Administrator. Can manage users, permissions, and settings for their company.', true),
  ('super_admin', 'Platform Administrator. Has full platform-wide access.', true)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_system_role = EXCLUDED.is_system_role;

-- =============================================
-- 2. ADD ADDITIONAL PERMISSIONS IF MISSING
-- =============================================

-- Basic access permissions
INSERT INTO rbac_permissions (resource, action, description) VALUES
  ('home', 'read', 'View home page'),
  ('requests', 'read_own', 'View own requests'),
  ('requests', 'edit_own', 'Edit own draft requests'),
  ('requests', 'read_all', 'View all company requests'),
  ('file_directory', 'read', 'View file directory (SharePoint documents)'),
  ('files', 'read', 'View files'),
  ('files', 'create', 'Create files'),
  ('files', 'update', 'Update files'),
  ('files', 'delete', 'Delete files'),
  ('files', 'share', 'Share files')
ON CONFLICT (resource, action) DO NOTHING;

-- User management permissions
INSERT INTO rbac_permissions (resource, action, description) VALUES
  ('users', 'manage', 'Manage company users'),
  ('users', 'manage_system', 'Manage system-wide users'),
  ('invites', 'manage', 'Manage user invitations')
ON CONFLICT (resource, action) DO NOTHING;

-- Request type permissions
INSERT INTO rbac_permissions (resource, action, description) VALUES
  ('user_accounts', 'create', 'Create user account requests'),
  ('user_accounts', 'approve', 'Approve user account requests'),
  ('user_offboarding', 'create', 'Create user offboarding requests'),
  ('facility_services', 'create', 'Create facility services requests'),
  ('office_services', 'create', 'Create office services requests'),
  ('accounts_payable', 'create', 'Create accounts payable requests'),
  ('finance', 'create', 'Create finance requests'),
  ('technology_training', 'create', 'Create technology training requests'),
  ('it_service_desk', 'create', 'Create IT service desk requests'),
  ('hr', 'create', 'Create HR requests'),
  ('department', 'create', 'Create department requests'),
  ('hardware', 'create', 'Create hardware requests'),
  ('hardware', 'read', 'View hardware requests'),
  ('hardware', 'approve', 'Approve hardware requests'),
  ('toner', 'create', 'Create toner requests'),
  ('toner', 'read', 'View toner requests'),
  ('toner', 'manage', 'Manage toner settings'),
  ('marketing', 'create', 'Create marketing requests'),
  ('marketing', 'read', 'View marketing requests'),
  ('marketing', 'approve', 'Approve marketing requests'),
  ('marketing', 'manage_campaigns', 'Manage marketing campaigns'),
  ('tickets', 'create', 'Create tickets'),
  ('tickets', 'read', 'View tickets'),
  ('tickets', 'update', 'Update tickets'),
  ('tickets', 'assign', 'Assign tickets'),
  ('tickets', 'resolve', 'Resolve tickets'),
  ('tickets', 'manage_watchers', 'Manage ticket watchers')
ON CONFLICT (resource, action) DO NOTHING;

-- Configuration permissions
INSERT INTO rbac_permissions (resource, action, description) VALUES
  ('settings', 'configure', 'Configure company settings'),
  ('features', 'manage', 'Manage company features'),
  ('integrations', 'manage_o365', 'Manage Office 365 integration'),
  ('sharepoint', 'configure', 'Configure SharePoint integration'),
  ('sharepoint', 'read', 'View SharePoint documents')
ON CONFLICT (resource, action) DO NOTHING;

-- System admin permissions
INSERT INTO rbac_permissions (resource, action, description) VALUES
  ('companies', 'manage_all', 'Manage all companies'),
  ('audit_logs', 'read', 'View audit logs'),
  ('file_storage', 'manage', 'Manage file storage'),
  ('rbac', 'manage', 'Manage roles and permissions'),
  ('metrics', 'read_system', 'View system-wide metrics'),
  ('metrics', 'read', 'View request metrics')
ON CONFLICT (resource, action) DO NOTHING;

-- Documentation and content permissions
INSERT INTO rbac_permissions (resource, action, description) VALUES
  ('modalities', 'read', 'View modality details'),
  ('modalities', 'create', 'Create modalities'),
  ('modalities', 'update', 'Update modalities'),
  ('modalities', 'delete', 'Delete modalities'),
  ('modalities', 'share', 'Share modalities'),
  ('newsletters', 'submit', 'Submit newsletter content'),
  ('newsletters', 'read', 'View newsletters'),
  ('newsletters', 'create', 'Create newsletters'),
  ('newsletters', 'approve', 'Approve newsletters'),
  ('newsletters', 'manage', 'Manage newsletter cycle'),
  ('news', 'read', 'View news articles'),
  ('news', 'create', 'Create news articles'),
  ('news', 'update', 'Update news articles'),
  ('news', 'delete', 'Delete news articles'),
  ('news', 'publish', 'Publish news articles'),
  ('knowledge_base', 'read', 'View knowledge base'),
  ('knowledge_base', 'create', 'Create knowledge base articles'),
  ('knowledge_base', 'update', 'Update knowledge base articles'),
  ('knowledge_base', 'delete', 'Delete knowledge base articles'),
  ('hr_documents', 'read', 'View HR documents'),
  ('eap_program', 'read', 'Access EAP program resources'),
  ('directory', 'read', 'View company directory'),
  ('directory', 'update', 'Update directory entries'),
  ('directory', 'manage', 'Manage company directory'),
  ('external_providers', 'read', 'View external providers'),
  ('external_providers', 'update', 'Update external providers')
ON CONFLICT (resource, action) DO NOTHING;

-- Reminder permissions
INSERT INTO rbac_permissions (resource, action, description) VALUES
  ('reminders', 'create', 'Create reminders'),
  ('reminders', 'read', 'View reminders'),
  ('reminders', 'update', 'Update reminders'),
  ('reminders', 'delete', 'Delete reminders'),
  ('reminders', 'manage_all', 'Manage all reminders')
ON CONFLICT (resource, action) DO NOTHING;

-- Fax campaign permissions
INSERT INTO rbac_permissions (resource, action, description) VALUES
  ('fax_campaigns', 'read', 'View fax campaigns'),
  ('fax_campaigns', 'create', 'Create fax campaigns'),
  ('fax_campaigns', 'send', 'Send fax campaigns')
ON CONFLICT (resource, action) DO NOTHING;

-- Custom pages permissions
INSERT INTO rbac_permissions (resource, action, description) VALUES
  ('custom_pages', 'read', 'View custom pages'),
  ('custom_pages', 'create', 'Create custom pages'),
  ('custom_pages', 'update', 'Update custom pages'),
  ('custom_pages', 'delete', 'Delete custom pages'),
  ('custom_pages', 'publish', 'Publish custom pages')
ON CONFLICT (resource, action) DO NOTHING;

-- Form template permissions
INSERT INTO rbac_permissions (resource, action, description) VALUES
  ('form_templates', 'read', 'View form templates'),
  ('form_templates', 'create', 'Create form templates'),
  ('form_templates', 'update', 'Update form templates'),
  ('form_templates', 'delete', 'Delete form templates')
ON CONFLICT (resource, action) DO NOTHING;

-- Brand permissions
INSERT INTO rbac_permissions (resource, action, description) VALUES
  ('brands', 'read', 'View brands'),
  ('brands', 'create', 'Create brands'),
  ('brands', 'update', 'Update brands'),
  ('brands', 'delete', 'Delete brands')
ON CONFLICT (resource, action) DO NOTHING;

-- Incident permissions
INSERT INTO rbac_permissions (resource, action, description) VALUES
  ('incidents', 'create', 'Create incidents'),
  ('incidents', 'read', 'View incidents'),
  ('incidents', 'update', 'Update incidents'),
  ('incidents', 'assign', 'Assign incidents'),
  ('incidents', 'manage', 'Manage incidents')
ON CONFLICT (resource, action) DO NOTHING;

-- Print ordering permissions
INSERT INTO rbac_permissions (resource, action, description) VALUES
  ('print_ordering', 'create', 'Create print orders'),
  ('print_ordering', 'read', 'View print orders'),
  ('print_ordering', 'manage', 'Manage print orders')
ON CONFLICT (resource, action) DO NOTHING;

-- Ticket management permissions
INSERT INTO rbac_permissions (resource, action, description) VALUES
  ('tickets', 'read_queue', 'View ticket queue'),
  ('tickets', 'read_audit', 'View ticket audit log'),
  ('tickets', 'start', 'Start working on tickets')
ON CONFLICT (resource, action) DO NOTHING;

-- Employee assistance permissions
INSERT INTO rbac_permissions (resource, action, description) VALUES
  ('employee_assistance', 'read', 'Access employee assistance resources')
ON CONFLICT (resource, action) DO NOTHING;

-- =============================================
-- 3. SEED ROLE-PERMISSION MAPPINGS
-- =============================================

-- Helper function to assign permission to role
CREATE OR REPLACE FUNCTION assign_permission_to_role(
  p_role_name TEXT,
  p_resource TEXT,
  p_action TEXT,
  p_effect TEXT DEFAULT 'allow'
) RETURNS VOID AS $$
DECLARE
  v_role_id UUID;
  v_permission_id UUID;
BEGIN
  -- Get role ID
  SELECT id INTO v_role_id FROM rbac_roles WHERE name = p_role_name;
  IF v_role_id IS NULL THEN
    RAISE NOTICE 'Role % not found', p_role_name;
    RETURN;
  END IF;

  -- Get permission ID
  SELECT id INTO v_permission_id FROM rbac_permissions WHERE resource = p_resource AND action = p_action;
  IF v_permission_id IS NULL THEN
    RAISE NOTICE 'Permission %:% not found', p_resource, p_action;
    RETURN;
  END IF;

  -- Insert role-permission mapping
  INSERT INTO rbac_role_permissions (role_id, permission_id, effect)
  VALUES (v_role_id, v_permission_id, p_effect)
  ON CONFLICT (role_id, permission_id) DO UPDATE SET effect = EXCLUDED.effect;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- REQUESTER ROLE PERMISSIONS (Basic Access)
-- =============================================

SELECT assign_permission_to_role('requester', 'home', 'read');
SELECT assign_permission_to_role('requester', 'requests', 'read_own');
SELECT assign_permission_to_role('requester', 'requests', 'edit_own');

-- Create requests
SELECT assign_permission_to_role('requester', 'hardware', 'create');
SELECT assign_permission_to_role('requester', 'toner', 'create');
SELECT assign_permission_to_role('requester', 'marketing', 'create');
SELECT assign_permission_to_role('requester', 'user_accounts', 'create');
SELECT assign_permission_to_role('requester', 'user_offboarding', 'create');
SELECT assign_permission_to_role('requester', 'tickets', 'create');
SELECT assign_permission_to_role('requester', 'facility_services', 'create');
SELECT assign_permission_to_role('requester', 'office_services', 'create');
SELECT assign_permission_to_role('requester', 'accounts_payable', 'create');
SELECT assign_permission_to_role('requester', 'finance', 'create');
SELECT assign_permission_to_role('requester', 'technology_training', 'create');
SELECT assign_permission_to_role('requester', 'it_service_desk', 'create');
SELECT assign_permission_to_role('requester', 'hr', 'create');
SELECT assign_permission_to_role('requester', 'department', 'create');

-- Documentation access
SELECT assign_permission_to_role('requester', 'modalities', 'read');
SELECT assign_permission_to_role('requester', 'sharepoint', 'read');
SELECT assign_permission_to_role('requester', 'newsletters', 'submit');
SELECT assign_permission_to_role('requester', 'news', 'read');
SELECT assign_permission_to_role('requester', 'knowledge_base', 'read');
SELECT assign_permission_to_role('requester', 'hr_documents', 'read');
SELECT assign_permission_to_role('requester', 'eap_program', 'read');
SELECT assign_permission_to_role('requester', 'employee_assistance', 'read');
SELECT assign_permission_to_role('requester', 'directory', 'read');
SELECT assign_permission_to_role('requester', 'external_providers', 'read');

-- Reminders
SELECT assign_permission_to_role('requester', 'reminders', 'create');
SELECT assign_permission_to_role('requester', 'reminders', 'read');
SELECT assign_permission_to_role('requester', 'reminders', 'update');
SELECT assign_permission_to_role('requester', 'reminders', 'delete');

-- Files
SELECT assign_permission_to_role('requester', 'files', 'read');

-- File Directory (SharePoint)
SELECT assign_permission_to_role('requester', 'file_directory', 'read');

-- =============================================
-- MARKETING ROLE PERMISSIONS (Requester + Marketing)
-- =============================================

-- Inherit requester permissions
SELECT assign_permission_to_role('marketing', 'home', 'read');
SELECT assign_permission_to_role('marketing', 'requests', 'read_own');
SELECT assign_permission_to_role('marketing', 'requests', 'edit_own');
SELECT assign_permission_to_role('marketing', 'hardware', 'create');
SELECT assign_permission_to_role('marketing', 'toner', 'create');
SELECT assign_permission_to_role('marketing', 'marketing', 'create');
SELECT assign_permission_to_role('marketing', 'user_accounts', 'create');
SELECT assign_permission_to_role('marketing', 'user_offboarding', 'create');
SELECT assign_permission_to_role('marketing', 'tickets', 'create');
SELECT assign_permission_to_role('marketing', 'facility_services', 'create');
SELECT assign_permission_to_role('marketing', 'office_services', 'create');
SELECT assign_permission_to_role('marketing', 'accounts_payable', 'create');
SELECT assign_permission_to_role('marketing', 'finance', 'create');
SELECT assign_permission_to_role('marketing', 'technology_training', 'create');
SELECT assign_permission_to_role('marketing', 'it_service_desk', 'create');
SELECT assign_permission_to_role('marketing', 'hr', 'create');
SELECT assign_permission_to_role('marketing', 'department', 'create');
SELECT assign_permission_to_role('marketing', 'modalities', 'read');
SELECT assign_permission_to_role('marketing', 'sharepoint', 'read');
SELECT assign_permission_to_role('marketing', 'newsletters', 'submit');
SELECT assign_permission_to_role('marketing', 'news', 'read');
SELECT assign_permission_to_role('marketing', 'knowledge_base', 'read');
SELECT assign_permission_to_role('marketing', 'hr_documents', 'read');
SELECT assign_permission_to_role('marketing', 'eap_program', 'read');
SELECT assign_permission_to_role('marketing', 'employee_assistance', 'read');
SELECT assign_permission_to_role('marketing', 'directory', 'read');
SELECT assign_permission_to_role('marketing', 'external_providers', 'read');
SELECT assign_permission_to_role('marketing', 'reminders', 'create');
SELECT assign_permission_to_role('marketing', 'reminders', 'read');
SELECT assign_permission_to_role('marketing', 'reminders', 'update');
SELECT assign_permission_to_role('marketing', 'reminders', 'delete');
SELECT assign_permission_to_role('marketing', 'files', 'read');
SELECT assign_permission_to_role('marketing', 'file_directory', 'read');

-- Marketing-specific permissions
SELECT assign_permission_to_role('marketing', 'marketing', 'read');
SELECT assign_permission_to_role('marketing', 'fax_campaigns', 'read');
SELECT assign_permission_to_role('marketing', 'fax_campaigns', 'create');
SELECT assign_permission_to_role('marketing', 'marketing', 'manage_campaigns');

-- =============================================
-- MANAGER ROLE PERMISSIONS (Requester + Approvals + Management)
-- =============================================

-- Inherit requester permissions
SELECT assign_permission_to_role('manager', 'home', 'read');
SELECT assign_permission_to_role('manager', 'requests', 'read_own');
SELECT assign_permission_to_role('manager', 'requests', 'edit_own');
SELECT assign_permission_to_role('manager', 'hardware', 'create');
SELECT assign_permission_to_role('manager', 'toner', 'create');
SELECT assign_permission_to_role('manager', 'marketing', 'create');
SELECT assign_permission_to_role('manager', 'user_accounts', 'create');
SELECT assign_permission_to_role('manager', 'user_offboarding', 'create');
SELECT assign_permission_to_role('manager', 'tickets', 'create');
SELECT assign_permission_to_role('manager', 'facility_services', 'create');
SELECT assign_permission_to_role('manager', 'office_services', 'create');
SELECT assign_permission_to_role('manager', 'accounts_payable', 'create');
SELECT assign_permission_to_role('manager', 'finance', 'create');
SELECT assign_permission_to_role('manager', 'technology_training', 'create');
SELECT assign_permission_to_role('manager', 'it_service_desk', 'create');
SELECT assign_permission_to_role('manager', 'hr', 'create');
SELECT assign_permission_to_role('manager', 'department', 'create');
SELECT assign_permission_to_role('manager', 'modalities', 'read');
SELECT assign_permission_to_role('manager', 'sharepoint', 'read');
SELECT assign_permission_to_role('manager', 'newsletters', 'submit');
SELECT assign_permission_to_role('manager', 'news', 'read');
SELECT assign_permission_to_role('manager', 'knowledge_base', 'read');
SELECT assign_permission_to_role('manager', 'hr_documents', 'read');
SELECT assign_permission_to_role('manager', 'eap_program', 'read');
SELECT assign_permission_to_role('manager', 'employee_assistance', 'read');
SELECT assign_permission_to_role('manager', 'directory', 'read');
SELECT assign_permission_to_role('manager', 'external_providers', 'read');
SELECT assign_permission_to_role('manager', 'reminders', 'create');
SELECT assign_permission_to_role('manager', 'reminders', 'read');
SELECT assign_permission_to_role('manager', 'reminders', 'update');
SELECT assign_permission_to_role('manager', 'reminders', 'delete');
SELECT assign_permission_to_role('manager', 'files', 'read');
SELECT assign_permission_to_role('manager', 'file_directory', 'read');

-- Approval permissions
SELECT assign_permission_to_role('manager', 'hardware', 'approve');
SELECT assign_permission_to_role('manager', 'user_accounts', 'approve');

-- Management permissions
SELECT assign_permission_to_role('manager', 'users', 'manage');
SELECT assign_permission_to_role('manager', 'newsletters', 'manage');
SELECT assign_permission_to_role('manager', 'requests', 'read_all');
SELECT assign_permission_to_role('manager', 'metrics', 'read');

-- Ticket management
SELECT assign_permission_to_role('manager', 'tickets', 'read');
SELECT assign_permission_to_role('manager', 'tickets', 'read_queue');
SELECT assign_permission_to_role('manager', 'tickets', 'read_audit');
SELECT assign_permission_to_role('manager', 'tickets', 'assign');
SELECT assign_permission_to_role('manager', 'tickets', 'start');
SELECT assign_permission_to_role('manager', 'tickets', 'resolve');
SELECT assign_permission_to_role('manager', 'tickets', 'manage_watchers');

-- Content management
SELECT assign_permission_to_role('manager', 'news', 'create');
SELECT assign_permission_to_role('manager', 'news', 'update');
SELECT assign_permission_to_role('manager', 'news', 'delete');
SELECT assign_permission_to_role('manager', 'knowledge_base', 'update');
SELECT assign_permission_to_role('manager', 'knowledge_base', 'delete');

-- =============================================
-- MARKETING MANAGER ROLE PERMISSIONS (Marketing + Approvals)
-- =============================================

-- Inherit marketing permissions
SELECT assign_permission_to_role('marketing_manager', 'home', 'read');
SELECT assign_permission_to_role('marketing_manager', 'requests', 'read_own');
SELECT assign_permission_to_role('marketing_manager', 'requests', 'edit_own');
SELECT assign_permission_to_role('marketing_manager', 'hardware', 'create');
SELECT assign_permission_to_role('marketing_manager', 'toner', 'create');
SELECT assign_permission_to_role('marketing_manager', 'marketing', 'create');
SELECT assign_permission_to_role('marketing_manager', 'user_accounts', 'create');
SELECT assign_permission_to_role('marketing_manager', 'user_offboarding', 'create');
SELECT assign_permission_to_role('marketing_manager', 'tickets', 'create');
SELECT assign_permission_to_role('marketing_manager', 'facility_services', 'create');
SELECT assign_permission_to_role('marketing_manager', 'office_services', 'create');
SELECT assign_permission_to_role('marketing_manager', 'accounts_payable', 'create');
SELECT assign_permission_to_role('marketing_manager', 'finance', 'create');
SELECT assign_permission_to_role('marketing_manager', 'technology_training', 'create');
SELECT assign_permission_to_role('marketing_manager', 'it_service_desk', 'create');
SELECT assign_permission_to_role('marketing_manager', 'hr', 'create');
SELECT assign_permission_to_role('marketing_manager', 'department', 'create');
SELECT assign_permission_to_role('marketing_manager', 'modalities', 'read');
SELECT assign_permission_to_role('marketing_manager', 'sharepoint', 'read');
SELECT assign_permission_to_role('marketing_manager', 'newsletters', 'submit');
SELECT assign_permission_to_role('marketing_manager', 'news', 'read');
SELECT assign_permission_to_role('marketing_manager', 'knowledge_base', 'read');
SELECT assign_permission_to_role('marketing_manager', 'hr_documents', 'read');
SELECT assign_permission_to_role('marketing_manager', 'eap_program', 'read');
SELECT assign_permission_to_role('marketing_manager', 'employee_assistance', 'read');
SELECT assign_permission_to_role('marketing_manager', 'directory', 'read');
SELECT assign_permission_to_role('marketing_manager', 'external_providers', 'read');
SELECT assign_permission_to_role('marketing_manager', 'reminders', 'create');
SELECT assign_permission_to_role('marketing_manager', 'reminders', 'read');
SELECT assign_permission_to_role('marketing_manager', 'reminders', 'update');
SELECT assign_permission_to_role('marketing_manager', 'reminders', 'delete');
SELECT assign_permission_to_role('marketing_manager', 'files', 'read');
SELECT assign_permission_to_role('marketing_manager', 'file_directory', 'read');
SELECT assign_permission_to_role('marketing_manager', 'marketing', 'read');
SELECT assign_permission_to_role('marketing_manager', 'fax_campaigns', 'read');
SELECT assign_permission_to_role('marketing_manager', 'fax_campaigns', 'create');
SELECT assign_permission_to_role('marketing_manager', 'marketing', 'manage_campaigns');

-- Marketing approval permissions
SELECT assign_permission_to_role('marketing_manager', 'marketing', 'approve');
SELECT assign_permission_to_role('marketing_manager', 'newsletters', 'approve');
SELECT assign_permission_to_role('marketing_manager', 'fax_campaigns', 'send');

-- Ticket management
SELECT assign_permission_to_role('marketing_manager', 'tickets', 'read');
SELECT assign_permission_to_role('marketing_manager', 'tickets', 'read_queue');
SELECT assign_permission_to_role('marketing_manager', 'tickets', 'read_audit');
SELECT assign_permission_to_role('marketing_manager', 'tickets', 'assign');
SELECT assign_permission_to_role('marketing_manager', 'tickets', 'start');
SELECT assign_permission_to_role('marketing_manager', 'tickets', 'resolve');
SELECT assign_permission_to_role('marketing_manager', 'tickets', 'manage_watchers');

-- Content management
SELECT assign_permission_to_role('marketing_manager', 'news', 'create');
SELECT assign_permission_to_role('marketing_manager', 'news', 'update');
SELECT assign_permission_to_role('marketing_manager', 'news', 'delete');
SELECT assign_permission_to_role('marketing_manager', 'knowledge_base', 'update');
SELECT assign_permission_to_role('marketing_manager', 'knowledge_base', 'delete');

-- =============================================
-- TENANT ADMIN ROLE PERMISSIONS (Full Company Access)
-- =============================================

-- All basic access
SELECT assign_permission_to_role('tenant_admin', 'home', 'read');
SELECT assign_permission_to_role('tenant_admin', 'requests', 'read_own');
SELECT assign_permission_to_role('tenant_admin', 'requests', 'edit_own');
SELECT assign_permission_to_role('tenant_admin', 'requests', 'read_all');

-- All create requests
SELECT assign_permission_to_role('tenant_admin', 'hardware', 'create');
SELECT assign_permission_to_role('tenant_admin', 'toner', 'create');
SELECT assign_permission_to_role('tenant_admin', 'marketing', 'create');
SELECT assign_permission_to_role('tenant_admin', 'user_accounts', 'create');
SELECT assign_permission_to_role('tenant_admin', 'user_offboarding', 'create');
SELECT assign_permission_to_role('tenant_admin', 'tickets', 'create');
SELECT assign_permission_to_role('tenant_admin', 'facility_services', 'create');
SELECT assign_permission_to_role('tenant_admin', 'office_services', 'create');
SELECT assign_permission_to_role('tenant_admin', 'accounts_payable', 'create');
SELECT assign_permission_to_role('tenant_admin', 'finance', 'create');
SELECT assign_permission_to_role('tenant_admin', 'technology_training', 'create');
SELECT assign_permission_to_role('tenant_admin', 'it_service_desk', 'create');
SELECT assign_permission_to_role('tenant_admin', 'hr', 'create');
SELECT assign_permission_to_role('tenant_admin', 'department', 'create');

-- All approvals
SELECT assign_permission_to_role('tenant_admin', 'hardware', 'approve');
SELECT assign_permission_to_role('tenant_admin', 'user_accounts', 'approve');
SELECT assign_permission_to_role('tenant_admin', 'marketing', 'approve');
SELECT assign_permission_to_role('tenant_admin', 'newsletters', 'approve');

-- All marketing
SELECT assign_permission_to_role('tenant_admin', 'marketing', 'read');
SELECT assign_permission_to_role('tenant_admin', 'fax_campaigns', 'read');
SELECT assign_permission_to_role('tenant_admin', 'fax_campaigns', 'create');
SELECT assign_permission_to_role('tenant_admin', 'fax_campaigns', 'send');
SELECT assign_permission_to_role('tenant_admin', 'marketing', 'manage_campaigns');

-- All management
SELECT assign_permission_to_role('tenant_admin', 'users', 'manage');
SELECT assign_permission_to_role('tenant_admin', 'newsletters', 'manage');
SELECT assign_permission_to_role('tenant_admin', 'metrics', 'read');

-- Configuration
SELECT assign_permission_to_role('tenant_admin', 'settings', 'configure');
SELECT assign_permission_to_role('tenant_admin', 'features', 'manage');
SELECT assign_permission_to_role('tenant_admin', 'integrations', 'manage_o365');
SELECT assign_permission_to_role('tenant_admin', 'sharepoint', 'configure');

-- Documentation
SELECT assign_permission_to_role('tenant_admin', 'modalities', 'read');
SELECT assign_permission_to_role('tenant_admin', 'modalities', 'create');
SELECT assign_permission_to_role('tenant_admin', 'modalities', 'update');
SELECT assign_permission_to_role('tenant_admin', 'modalities', 'delete');
SELECT assign_permission_to_role('tenant_admin', 'modalities', 'share');
SELECT assign_permission_to_role('tenant_admin', 'sharepoint', 'read');
SELECT assign_permission_to_role('tenant_admin', 'newsletters', 'submit');
SELECT assign_permission_to_role('tenant_admin', 'newsletters', 'read');
SELECT assign_permission_to_role('tenant_admin', 'newsletters', 'create');
SELECT assign_permission_to_role('tenant_admin', 'news', 'read');
SELECT assign_permission_to_role('tenant_admin', 'news', 'create');
SELECT assign_permission_to_role('tenant_admin', 'news', 'update');
SELECT assign_permission_to_role('tenant_admin', 'news', 'delete');
SELECT assign_permission_to_role('tenant_admin', 'news', 'publish');
SELECT assign_permission_to_role('tenant_admin', 'knowledge_base', 'read');
SELECT assign_permission_to_role('tenant_admin', 'knowledge_base', 'create');
SELECT assign_permission_to_role('tenant_admin', 'knowledge_base', 'update');
SELECT assign_permission_to_role('tenant_admin', 'knowledge_base', 'delete');
SELECT assign_permission_to_role('tenant_admin', 'hr_documents', 'read');
SELECT assign_permission_to_role('tenant_admin', 'eap_program', 'read');
SELECT assign_permission_to_role('tenant_admin', 'employee_assistance', 'read');
SELECT assign_permission_to_role('tenant_admin', 'directory', 'read');
SELECT assign_permission_to_role('tenant_admin', 'directory', 'update');
SELECT assign_permission_to_role('tenant_admin', 'directory', 'manage');
SELECT assign_permission_to_role('tenant_admin', 'external_providers', 'read');
SELECT assign_permission_to_role('tenant_admin', 'external_providers', 'update');

-- Reminders
SELECT assign_permission_to_role('tenant_admin', 'reminders', 'create');
SELECT assign_permission_to_role('tenant_admin', 'reminders', 'read');
SELECT assign_permission_to_role('tenant_admin', 'reminders', 'update');
SELECT assign_permission_to_role('tenant_admin', 'reminders', 'delete');
SELECT assign_permission_to_role('tenant_admin', 'reminders', 'manage_all');

-- Ticket management
SELECT assign_permission_to_role('tenant_admin', 'tickets', 'read');
SELECT assign_permission_to_role('tenant_admin', 'tickets', 'update');
SELECT assign_permission_to_role('tenant_admin', 'tickets', 'read_queue');
SELECT assign_permission_to_role('tenant_admin', 'tickets', 'read_audit');
SELECT assign_permission_to_role('tenant_admin', 'tickets', 'assign');
SELECT assign_permission_to_role('tenant_admin', 'tickets', 'start');
SELECT assign_permission_to_role('tenant_admin', 'tickets', 'resolve');
SELECT assign_permission_to_role('tenant_admin', 'tickets', 'manage_watchers');

-- Files
SELECT assign_permission_to_role('tenant_admin', 'files', 'create');
SELECT assign_permission_to_role('tenant_admin', 'files', 'read');
SELECT assign_permission_to_role('tenant_admin', 'files', 'update');
SELECT assign_permission_to_role('tenant_admin', 'files', 'delete');
SELECT assign_permission_to_role('tenant_admin', 'files', 'share');
SELECT assign_permission_to_role('tenant_admin', 'file_directory', 'read');

-- Custom pages
SELECT assign_permission_to_role('tenant_admin', 'custom_pages', 'read');
SELECT assign_permission_to_role('tenant_admin', 'custom_pages', 'create');
SELECT assign_permission_to_role('tenant_admin', 'custom_pages', 'update');
SELECT assign_permission_to_role('tenant_admin', 'custom_pages', 'delete');
SELECT assign_permission_to_role('tenant_admin', 'custom_pages', 'publish');

-- Form templates
SELECT assign_permission_to_role('tenant_admin', 'form_templates', 'read');
SELECT assign_permission_to_role('tenant_admin', 'form_templates', 'create');
SELECT assign_permission_to_role('tenant_admin', 'form_templates', 'update');
SELECT assign_permission_to_role('tenant_admin', 'form_templates', 'delete');

-- Brands
SELECT assign_permission_to_role('tenant_admin', 'brands', 'read');
SELECT assign_permission_to_role('tenant_admin', 'brands', 'create');
SELECT assign_permission_to_role('tenant_admin', 'brands', 'update');
SELECT assign_permission_to_role('tenant_admin', 'brands', 'delete');

-- Incidents
SELECT assign_permission_to_role('tenant_admin', 'incidents', 'create');
SELECT assign_permission_to_role('tenant_admin', 'incidents', 'read');
SELECT assign_permission_to_role('tenant_admin', 'incidents', 'update');
SELECT assign_permission_to_role('tenant_admin', 'incidents', 'assign');
SELECT assign_permission_to_role('tenant_admin', 'incidents', 'manage');

-- Invites
SELECT assign_permission_to_role('tenant_admin', 'invites', 'manage');

-- Toner management
SELECT assign_permission_to_role('tenant_admin', 'toner', 'read');
SELECT assign_permission_to_role('tenant_admin', 'toner', 'manage');

-- Print ordering
SELECT assign_permission_to_role('tenant_admin', 'print_ordering', 'create');
SELECT assign_permission_to_role('tenant_admin', 'print_ordering', 'read');
SELECT assign_permission_to_role('tenant_admin', 'print_ordering', 'manage');

-- Hardware read
SELECT assign_permission_to_role('tenant_admin', 'hardware', 'read');

-- =============================================
-- SUPER ADMIN ROLE PERMISSIONS (Full Platform Access)
-- =============================================

-- Note: Super admins are handled specially in the RBAC context
-- They automatically have access to everything.
-- However, we still assign explicit permissions for consistency and audit purposes.

-- All tenant admin permissions plus system admin permissions
SELECT assign_permission_to_role('super_admin', 'home', 'read');
SELECT assign_permission_to_role('super_admin', 'requests', 'read_own');
SELECT assign_permission_to_role('super_admin', 'requests', 'edit_own');
SELECT assign_permission_to_role('super_admin', 'requests', 'read_all');
SELECT assign_permission_to_role('super_admin', 'hardware', 'create');
SELECT assign_permission_to_role('super_admin', 'hardware', 'read');
SELECT assign_permission_to_role('super_admin', 'hardware', 'approve');
SELECT assign_permission_to_role('super_admin', 'toner', 'create');
SELECT assign_permission_to_role('super_admin', 'toner', 'read');
SELECT assign_permission_to_role('super_admin', 'toner', 'manage');
SELECT assign_permission_to_role('super_admin', 'marketing', 'create');
SELECT assign_permission_to_role('super_admin', 'marketing', 'read');
SELECT assign_permission_to_role('super_admin', 'marketing', 'approve');
SELECT assign_permission_to_role('super_admin', 'marketing', 'manage_campaigns');
SELECT assign_permission_to_role('super_admin', 'user_accounts', 'create');
SELECT assign_permission_to_role('super_admin', 'user_accounts', 'approve');
SELECT assign_permission_to_role('super_admin', 'user_offboarding', 'create');
SELECT assign_permission_to_role('super_admin', 'tickets', 'create');
SELECT assign_permission_to_role('super_admin', 'tickets', 'read');
SELECT assign_permission_to_role('super_admin', 'tickets', 'update');
SELECT assign_permission_to_role('super_admin', 'tickets', 'read_queue');
SELECT assign_permission_to_role('super_admin', 'tickets', 'read_audit');
SELECT assign_permission_to_role('super_admin', 'tickets', 'assign');
SELECT assign_permission_to_role('super_admin', 'tickets', 'start');
SELECT assign_permission_to_role('super_admin', 'tickets', 'resolve');
SELECT assign_permission_to_role('super_admin', 'tickets', 'manage_watchers');
SELECT assign_permission_to_role('super_admin', 'facility_services', 'create');
SELECT assign_permission_to_role('super_admin', 'office_services', 'create');
SELECT assign_permission_to_role('super_admin', 'accounts_payable', 'create');
SELECT assign_permission_to_role('super_admin', 'finance', 'create');
SELECT assign_permission_to_role('super_admin', 'technology_training', 'create');
SELECT assign_permission_to_role('super_admin', 'it_service_desk', 'create');
SELECT assign_permission_to_role('super_admin', 'hr', 'create');
SELECT assign_permission_to_role('super_admin', 'department', 'create');

-- All configuration
SELECT assign_permission_to_role('super_admin', 'settings', 'configure');
SELECT assign_permission_to_role('super_admin', 'features', 'manage');
SELECT assign_permission_to_role('super_admin', 'integrations', 'manage_o365');
SELECT assign_permission_to_role('super_admin', 'sharepoint', 'configure');

-- All documentation
SELECT assign_permission_to_role('super_admin', 'modalities', 'read');
SELECT assign_permission_to_role('super_admin', 'modalities', 'create');
SELECT assign_permission_to_role('super_admin', 'modalities', 'update');
SELECT assign_permission_to_role('super_admin', 'modalities', 'delete');
SELECT assign_permission_to_role('super_admin', 'modalities', 'share');
SELECT assign_permission_to_role('super_admin', 'sharepoint', 'read');
SELECT assign_permission_to_role('super_admin', 'newsletters', 'submit');
SELECT assign_permission_to_role('super_admin', 'newsletters', 'read');
SELECT assign_permission_to_role('super_admin', 'newsletters', 'create');
SELECT assign_permission_to_role('super_admin', 'newsletters', 'approve');
SELECT assign_permission_to_role('super_admin', 'newsletters', 'manage');
SELECT assign_permission_to_role('super_admin', 'news', 'read');
SELECT assign_permission_to_role('super_admin', 'news', 'create');
SELECT assign_permission_to_role('super_admin', 'news', 'update');
SELECT assign_permission_to_role('super_admin', 'news', 'delete');
SELECT assign_permission_to_role('super_admin', 'news', 'publish');
SELECT assign_permission_to_role('super_admin', 'knowledge_base', 'read');
SELECT assign_permission_to_role('super_admin', 'knowledge_base', 'create');
SELECT assign_permission_to_role('super_admin', 'knowledge_base', 'update');
SELECT assign_permission_to_role('super_admin', 'knowledge_base', 'delete');
SELECT assign_permission_to_role('super_admin', 'hr_documents', 'read');
SELECT assign_permission_to_role('super_admin', 'eap_program', 'read');
SELECT assign_permission_to_role('super_admin', 'employee_assistance', 'read');
SELECT assign_permission_to_role('super_admin', 'directory', 'read');
SELECT assign_permission_to_role('super_admin', 'directory', 'update');
SELECT assign_permission_to_role('super_admin', 'directory', 'manage');
SELECT assign_permission_to_role('super_admin', 'external_providers', 'read');
SELECT assign_permission_to_role('super_admin', 'external_providers', 'update');

-- Fax campaigns
SELECT assign_permission_to_role('super_admin', 'fax_campaigns', 'read');
SELECT assign_permission_to_role('super_admin', 'fax_campaigns', 'create');
SELECT assign_permission_to_role('super_admin', 'fax_campaigns', 'send');

-- Reminders
SELECT assign_permission_to_role('super_admin', 'reminders', 'create');
SELECT assign_permission_to_role('super_admin', 'reminders', 'read');
SELECT assign_permission_to_role('super_admin', 'reminders', 'update');
SELECT assign_permission_to_role('super_admin', 'reminders', 'delete');
SELECT assign_permission_to_role('super_admin', 'reminders', 'manage_all');

-- Files
SELECT assign_permission_to_role('super_admin', 'files', 'create');
SELECT assign_permission_to_role('super_admin', 'files', 'read');
SELECT assign_permission_to_role('super_admin', 'files', 'update');
SELECT assign_permission_to_role('super_admin', 'files', 'delete');
SELECT assign_permission_to_role('super_admin', 'files', 'share');
SELECT assign_permission_to_role('super_admin', 'file_directory', 'read');

-- Custom pages
SELECT assign_permission_to_role('super_admin', 'custom_pages', 'read');
SELECT assign_permission_to_role('super_admin', 'custom_pages', 'create');
SELECT assign_permission_to_role('super_admin', 'custom_pages', 'update');
SELECT assign_permission_to_role('super_admin', 'custom_pages', 'delete');
SELECT assign_permission_to_role('super_admin', 'custom_pages', 'publish');

-- Form templates
SELECT assign_permission_to_role('super_admin', 'form_templates', 'read');
SELECT assign_permission_to_role('super_admin', 'form_templates', 'create');
SELECT assign_permission_to_role('super_admin', 'form_templates', 'update');
SELECT assign_permission_to_role('super_admin', 'form_templates', 'delete');

-- Brands
SELECT assign_permission_to_role('super_admin', 'brands', 'read');
SELECT assign_permission_to_role('super_admin', 'brands', 'create');
SELECT assign_permission_to_role('super_admin', 'brands', 'update');
SELECT assign_permission_to_role('super_admin', 'brands', 'delete');

-- Incidents
SELECT assign_permission_to_role('super_admin', 'incidents', 'create');
SELECT assign_permission_to_role('super_admin', 'incidents', 'read');
SELECT assign_permission_to_role('super_admin', 'incidents', 'update');
SELECT assign_permission_to_role('super_admin', 'incidents', 'assign');
SELECT assign_permission_to_role('super_admin', 'incidents', 'manage');

-- Print ordering
SELECT assign_permission_to_role('super_admin', 'print_ordering', 'create');
SELECT assign_permission_to_role('super_admin', 'print_ordering', 'read');
SELECT assign_permission_to_role('super_admin', 'print_ordering', 'manage');

-- System admin permissions
SELECT assign_permission_to_role('super_admin', 'companies', 'manage_all');
SELECT assign_permission_to_role('super_admin', 'users', 'manage');
SELECT assign_permission_to_role('super_admin', 'users', 'manage_system');
SELECT assign_permission_to_role('super_admin', 'audit_logs', 'read');
SELECT assign_permission_to_role('super_admin', 'file_storage', 'manage');
SELECT assign_permission_to_role('super_admin', 'invites', 'manage');
SELECT assign_permission_to_role('super_admin', 'rbac', 'manage');
SELECT assign_permission_to_role('super_admin', 'metrics', 'read');
SELECT assign_permission_to_role('super_admin', 'metrics', 'read_system');

-- Clean up helper function (include full signature for PostgreSQL)
DROP FUNCTION IF EXISTS assign_permission_to_role(TEXT, TEXT, TEXT, TEXT);

-- =============================================
-- 4. SUMMARY
-- =============================================

-- Display counts for verification
DO $$
DECLARE
  role_count INTEGER;
  permission_count INTEGER;
  role_permission_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count FROM rbac_roles;
  SELECT COUNT(*) INTO permission_count FROM rbac_permissions;
  SELECT COUNT(*) INTO role_permission_count FROM rbac_role_permissions;

  RAISE NOTICE 'RBAC Setup Complete:';
  RAISE NOTICE '  - Roles: %', role_count;
  RAISE NOTICE '  - Permissions: %', permission_count;
  RAISE NOTICE '  - Role-Permission Mappings: %', role_permission_count;
END $$;
