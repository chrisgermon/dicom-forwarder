-- Add missing user offboarding permissions to role_permissions table
-- This ensures the create_user_offboarding_request and approve_user_offboarding_requests
-- permissions are available for all companies

DO $$
DECLARE
  company_record RECORD;
  role_record RECORD;
BEGIN
  -- For each company
  FOR company_record IN SELECT id FROM companies WHERE active = true
  LOOP
    -- For each role
    FOR role_record IN SELECT unnest(enum_range(NULL::user_role)) AS role
    LOOP
      -- Insert create_user_offboarding_request permission if it doesn't exist
      INSERT INTO role_permissions (company_id, role, permission_key, enabled)
      VALUES (
        company_record.id,
        role_record.role,
        'create_user_offboarding_request',
        CASE 
          WHEN role_record.role IN ('requester', 'manager', 'tenant_admin') THEN true
          ELSE false
        END
      )
      ON CONFLICT (company_id, role, permission_key) DO NOTHING;

      -- Insert approve_user_offboarding_requests permission if it doesn't exist
      INSERT INTO role_permissions (company_id, role, permission_key, enabled)
      VALUES (
        company_record.id,
        role_record.role,
        'approve_user_offboarding_requests',
        CASE 
          WHEN role_record.role IN ('manager', 'tenant_admin') THEN true
          ELSE false
        END
      )
      ON CONFLICT (company_id, role, permission_key) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;