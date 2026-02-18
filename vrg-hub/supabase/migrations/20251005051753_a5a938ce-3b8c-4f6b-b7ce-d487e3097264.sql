-- Ensure all permission keys exist in role_permissions for all companies and roles
-- This migration syncs all permissions defined in the app with the database

-- First, let's add any missing permission keys to all existing company/role combinations
DO $$
DECLARE
  company_rec RECORD;
  role_val TEXT;
  perm_key TEXT;
BEGIN
  -- List of all available roles
  FOR role_val IN 
    SELECT unnest(ARRAY['requester', 'manager', 'tenant_admin'])
  LOOP
    -- List of all permission keys from our app
    FOR perm_key IN 
      SELECT unnest(ARRAY[
        'view_dashboard',
        'view_own_requests',
        'view_all_company_requests',
        'view_request_metrics',
        'view_modality_details',
        'view_sharepoint_documents',
        'create_hardware_request',
        'create_toner_request',
        'create_marketing_request',
        'create_user_account_request',
        'edit_own_drafts',
        'approve_hardware_requests',
        'approve_marketing_requests',
        'approve_user_account_requests',
        'approve_newsletter_submissions',
        'manage_company_users',
        'manage_hardware_catalog',
        'manage_newsletter_cycle',
        'configure_company_settings',
        'manage_company_features',
        'manage_office365_integration',
        'configure_sharepoint',
        'submit_newsletter'
      ])
    LOOP
      -- For each active company, ensure the permission exists
      FOR company_rec IN 
        SELECT id FROM public.companies WHERE active = true
      LOOP
        -- Insert if not exists
        INSERT INTO public.role_permissions (company_id, role, permission_key, enabled)
        VALUES (
          company_rec.id,
          role_val::user_role,
          perm_key,
          CASE 
            -- Tenant admins get everything by default
            WHEN role_val = 'tenant_admin' THEN true
            -- Managers get most things
            WHEN role_val = 'manager' THEN perm_key IN (
              'view_dashboard',
              'view_own_requests',
              'view_all_company_requests',
              'view_request_metrics',
              'create_hardware_request',
              'create_toner_request',
              'create_marketing_request',
              'create_user_account_request',
              'edit_own_drafts',
              'approve_hardware_requests',
              'approve_marketing_requests',
              'approve_user_account_requests',
              'approve_newsletter_submissions',
              'manage_company_users',
              'manage_hardware_catalog',
              'manage_newsletter_cycle'
            )
            -- Requesters get basic permissions
            WHEN role_val = 'requester' THEN perm_key IN (
              'view_dashboard',
              'view_own_requests',
              'create_hardware_request',
              'create_toner_request',
              'create_marketing_request',
              'create_user_account_request',
              'edit_own_drafts',
              'submit_newsletter',
              'view_modality_details',
              'view_sharepoint_documents'
            )
            ELSE false
          END
        )
        ON CONFLICT (company_id, role, permission_key) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Add comment explaining the permission system
COMMENT ON TABLE public.role_permissions IS 'Controls what actions each role can perform. Permissions can be toggled per company and role.';
COMMENT ON TABLE public.user_permissions IS 'User-specific permission overrides that take precedence over role permissions.';
COMMENT ON TABLE public.menu_configurations IS 'Controls visibility of menu items for each role.';
COMMENT ON TABLE public.company_features IS 'Feature flags to enable/disable entire features for a company.';