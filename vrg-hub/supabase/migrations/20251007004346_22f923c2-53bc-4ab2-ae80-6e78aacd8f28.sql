-- Add comprehensive granular permissions to the permission_type enum

-- First, let's add all the missing permission types to the enum
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'create_hardware_request';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'create_toner_request';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'create_user_account_request';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'create_user_offboarding_request';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'create_marketing_request';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'view_marketing_requests';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'view_user_accounts';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'view_user_offboarding';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'view_hardware_requests';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'view_toner_requests';

-- Helpdesk permissions
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'create_helpdesk_ticket';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'view_helpdesk_tickets';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'manage_helpdesk_tickets';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'assign_helpdesk_tickets';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'manage_helpdesk_departments';

-- News & Newsletter permissions
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'create_news_article';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'publish_news_article';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'delete_news_article';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'create_newsletter_submission';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'review_newsletter_submission';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'export_newsletter';

-- Catalog & Hardware permissions
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'view_hardware_catalog';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'create_catalog_item';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'edit_catalog_item';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'delete_catalog_item';

-- Settings & Configuration permissions
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'manage_company_settings';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'manage_company_locations';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'manage_company_domains';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'manage_company_features';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'manage_role_permissions';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'manage_user_permissions';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'manage_workflows';

-- Integration permissions
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'manage_office365';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'sync_office365_users';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'manage_sharepoint';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'manage_halo_integration';

-- Modality & Network permissions
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'view_modality_management';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'manage_modality';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'manage_clinic_network';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'share_clinic_details';

-- System & Analytics permissions
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'view_dashboard_analytics';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'view_request_metrics';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'manage_system_banners';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'manage_system_status';

-- Documentation & Knowledge Base permissions
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'view_documentation';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'manage_documentation';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'view_knowledge_base';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'manage_knowledge_base';

-- Company Directory permissions
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'view_company_directory';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'manage_company_directory';

-- Notification permissions
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'manage_notifications';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'send_notifications';

-- User invite permissions
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'create_user_invite';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'revoke_user_invite';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'resend_user_invite';

COMMENT ON TYPE permission_type IS 'Granular permission types for user access control. Used in user_permissions and role_permissions tables to define what actions users can perform.';