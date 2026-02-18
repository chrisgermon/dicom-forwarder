-- Add comprehensive RBAC permissions for all features

-- Reminders
INSERT INTO rbac_permissions (resource, action, description) VALUES
('reminders', 'create', 'Create personal reminders'),
('reminders', 'read', 'View own reminders'),
('reminders', 'update', 'Update own reminders'),
('reminders', 'delete', 'Delete own reminders'),
('reminders', 'manage_all', 'Manage all user reminders')
ON CONFLICT (resource, action) DO NOTHING;

-- Incidents
INSERT INTO rbac_permissions (resource, action, description) VALUES
('incidents', 'create', 'Report workplace incidents'),
('incidents', 'read', 'View incident reports'),
('incidents', 'update', 'Update incident reports'),
('incidents', 'assign', 'Assign incidents for investigation'),
('incidents', 'manage', 'Manage all incidents')
ON CONFLICT (resource, action) DO NOTHING;

-- News/Articles
INSERT INTO rbac_permissions (resource, action, description) VALUES
('news', 'create', 'Create news articles'),
('news', 'read', 'View news articles'),
('news', 'update', 'Update news articles'),
('news', 'delete', 'Delete news articles'),
('news', 'publish', 'Publish news articles')
ON CONFLICT (resource, action) DO NOTHING;

-- Knowledge Base
INSERT INTO rbac_permissions (resource, action, description) VALUES
('knowledge_base', 'create', 'Create knowledge base articles'),
('knowledge_base', 'read', 'View knowledge base'),
('knowledge_base', 'update', 'Update knowledge base articles'),
('knowledge_base', 'delete', 'Delete knowledge base articles')
ON CONFLICT (resource, action) DO NOTHING;

-- Custom Pages
INSERT INTO rbac_permissions (resource, action, description) VALUES
('custom_pages', 'create', 'Create custom pages'),
('custom_pages', 'read', 'View custom pages'),
('custom_pages', 'update', 'Update custom pages'),
('custom_pages', 'delete', 'Delete custom pages'),
('custom_pages', 'publish', 'Publish custom pages')
ON CONFLICT (resource, action) DO NOTHING;

-- Brands
INSERT INTO rbac_permissions (resource, action, description) VALUES
('brands', 'create', 'Create new brands'),
('brands', 'read', 'View brand information'),
('brands', 'update', 'Update brand settings'),
('brands', 'delete', 'Delete brands')
ON CONFLICT (resource, action) DO NOTHING;

-- Directory
INSERT INTO rbac_permissions (resource, action, description) VALUES
('directory', 'read', 'View company directory'),
('directory', 'update', 'Update directory entries'),
('directory', 'manage', 'Manage directory categories and entries')
ON CONFLICT (resource, action) DO NOTHING;

-- External Providers
INSERT INTO rbac_permissions (resource, action, description) VALUES
('external_providers', 'read', 'View external providers'),
('external_providers', 'update', 'Update external provider information')
ON CONFLICT (resource, action) DO NOTHING;

-- Modalities
INSERT INTO rbac_permissions (resource, action, description) VALUES
('modalities', 'create', 'Create modality records'),
('modalities', 'read', 'View modality information'),
('modalities', 'update', 'Update modality records'),
('modalities', 'delete', 'Delete modality records'),
('modalities', 'share', 'Generate shareable modality links')
ON CONFLICT (resource, action) DO NOTHING;

-- Form Templates
INSERT INTO rbac_permissions (resource, action, description) VALUES
('form_templates', 'create', 'Create form templates'),
('form_templates', 'read', 'View form templates'),
('form_templates', 'update', 'Update form templates'),
('form_templates', 'delete', 'Delete form templates')
ON CONFLICT (resource, action) DO NOTHING;

-- Newsletters
INSERT INTO rbac_permissions (resource, action, description) VALUES
('newsletters', 'create', 'Create newsletter cycles'),
('newsletters', 'read', 'View newsletters'),
('newsletters', 'submit', 'Submit newsletter content'),
('newsletters', 'approve', 'Approve newsletter submissions'),
('newsletters', 'manage', 'Manage newsletter cycles and assignments')
ON CONFLICT (resource, action) DO NOTHING;

-- Tickets
INSERT INTO rbac_permissions (resource, action, description) VALUES
('tickets', 'create', 'Create support tickets'),
('tickets', 'read', 'View tickets'),
('tickets', 'update', 'Update ticket status'),
('tickets', 'assign', 'Assign tickets to users'),
('tickets', 'resolve', 'Mark tickets as resolved'),
('tickets', 'manage_watchers', 'Manage ticket watchers')
ON CONFLICT (resource, action) DO NOTHING;

-- Fax Campaigns
INSERT INTO rbac_permissions (resource, action, description) VALUES
('fax_campaigns', 'create', 'Create fax campaigns'),
('fax_campaigns', 'read', 'View fax campaign logs'),
('fax_campaigns', 'send', 'Send fax campaigns')
ON CONFLICT (resource, action) DO NOTHING;

-- Marketing
INSERT INTO rbac_permissions (resource, action, description) VALUES
('marketing', 'create', 'Create marketing requests'),
('marketing', 'read', 'View marketing requests'),
('marketing', 'approve', 'Approve marketing requests'),
('marketing', 'manage_campaigns', 'Manage marketing campaigns')
ON CONFLICT (resource, action) DO NOTHING;

-- Hardware/IT
INSERT INTO rbac_permissions (resource, action, description) VALUES
('hardware', 'create', 'Create hardware requests'),
('hardware', 'read', 'View hardware requests'),
('hardware', 'approve', 'Approve hardware requests'),
('toner', 'create', 'Create toner requests'),
('toner', 'read', 'View toner requests'),
('toner', 'manage', 'Manage toner inventory')
ON CONFLICT (resource, action) DO NOTHING;

-- Files/Documents  
INSERT INTO rbac_permissions (resource, action, description) VALUES
('files', 'create', 'Upload files'),
('files', 'read', 'View and download files'),
('files', 'update', 'Update file metadata'),
('files', 'delete', 'Delete files'),
('files', 'share', 'Share files with others')
ON CONFLICT (resource, action) DO NOTHING;

-- HR
INSERT INTO rbac_permissions (resource, action, description) VALUES
('hr_documents', 'read', 'View HR documents'),
('hr_assistance', 'read', 'Access HR assistance resources'),
('eap_program', 'read', 'Access Employee Assistance Program')
ON CONFLICT (resource, action) DO NOTHING;

-- Dashboard/Metrics
INSERT INTO rbac_permissions (resource, action, description) VALUES
('dashboard', 'read', 'View dashboard'),
('metrics', 'read', 'View analytics and metrics')
ON CONFLICT (resource, action) DO NOTHING;

-- Print Ordering
INSERT INTO rbac_permissions (resource, action, description) VALUES
('print_ordering', 'create', 'Create print orders'),
('print_ordering', 'read', 'View print orders'),
('print_ordering', 'manage', 'Manage print brands and catalogs')
ON CONFLICT (resource, action) DO NOTHING;