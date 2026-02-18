-- Add fax campaigns permission
DO $$
DECLARE
  company_record RECORD;
BEGIN
  -- Add permission for all companies where the feature should be available
  FOR company_record IN SELECT id FROM companies WHERE active = true
  LOOP
    -- Add permission for tenant_admin role only by default
    INSERT INTO role_permissions (company_id, role, permission_key, enabled)
    VALUES 
      (company_record.id, 'tenant_admin', 'view_fax_campaigns', true),
      (company_record.id, 'manager', 'view_fax_campaigns', false),
      (company_record.id, 'marketing_manager', 'view_fax_campaigns', false),
      (company_record.id, 'marketing', 'view_fax_campaigns', false),
      (company_record.id, 'requester', 'view_fax_campaigns', false)
    ON CONFLICT (company_id, role, permission_key) DO NOTHING;
  END LOOP;
END $$;

-- Add fax_campaigns feature flag for companies
INSERT INTO company_features (company_id, feature_key, enabled)
SELECT id, 'fax_campaigns', true
FROM companies
WHERE active = true
ON CONFLICT (company_id, feature_key) DO NOTHING;