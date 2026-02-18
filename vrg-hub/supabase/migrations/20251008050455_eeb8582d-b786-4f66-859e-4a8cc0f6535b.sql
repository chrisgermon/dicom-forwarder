-- Enable department request permissions for Crowd IT
DO $$
DECLARE
  crowdit_company_id UUID;
BEGIN
  SELECT id INTO crowdit_company_id FROM companies WHERE name = 'Crowd IT' LIMIT 1;
  
  IF crowdit_company_id IS NOT NULL THEN
    -- Seed departments for Crowd IT if they don't exist
    IF NOT EXISTS (SELECT 1 FROM helpdesk_departments WHERE company_id = crowdit_company_id) THEN
      PERFORM seed_helpdesk_departments(crowdit_company_id);
    END IF;
    
    -- Add permissions for all roles in Crowd IT
    INSERT INTO role_permissions (company_id, role, permission_key, enabled)
    SELECT crowdit_company_id, role::user_role, permission_key, true
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
END $$;