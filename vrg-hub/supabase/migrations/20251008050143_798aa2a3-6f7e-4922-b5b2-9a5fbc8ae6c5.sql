-- Seed helpdesk departments for all companies
DO $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN SELECT id FROM companies WHERE active = true
  LOOP
    -- Only seed if departments don't exist for this company
    IF NOT EXISTS (SELECT 1 FROM helpdesk_departments WHERE company_id = company_record.id) THEN
      PERFORM seed_helpdesk_departments(company_record.id);
    END IF;
  END LOOP;
END $$;

-- Add permission keys for department request types
DO $$
BEGIN
  -- Check if permission_key column exists in role_permissions table
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'role_permissions' 
             AND column_name = 'permission_key') THEN
    
    -- Get Vision Radiology Group company ID
    DECLARE
      vrg_company_id UUID;
    BEGIN
      SELECT id INTO vrg_company_id FROM companies WHERE name = 'Vision Radiology Group' LIMIT 1;
      
      IF vrg_company_id IS NOT NULL THEN
        -- Add permissions for all roles in Vision Radiology Group
        INSERT INTO role_permissions (company_id, role, permission_key, enabled)
        SELECT vrg_company_id, role, permission_key, true
        FROM (
          VALUES 
            ('create_facility_services_request'),
            ('create_office_services_request'),
            ('create_accounts_payable_request'),
            ('create_finance_request'),
            ('create_technology_training_request'),
            ('create_it_service_desk_request'),
            ('create_hr_request'),
            ('create_marketing_service_request')
        ) AS perms(permission_key)
        CROSS JOIN (
          VALUES ('requester'), ('marketing'), ('manager'), ('marketing_manager'), ('tenant_admin')
        ) AS roles(role)
        ON CONFLICT (company_id, role, permission_key) DO UPDATE
        SET enabled = true;
      END IF;
    END;
  END IF;
END $$;