-- Add permissions for modality and department page editing
INSERT INTO rbac_permissions (resource, action, description) VALUES 
  ('modality_pages', 'read', 'View modality pages'),
  ('modality_pages', 'update', 'Edit modality page content and modules'),
  ('modality_pages', 'manage', 'Full management of modality pages including creating modules'),
  ('department_pages', 'read', 'View department pages'),
  ('department_pages', 'update', 'Edit department page content and modules'),
  ('department_pages', 'manage', 'Full management of department pages including creating modules')
ON CONFLICT (resource, action) DO NOTHING;

-- Grant permissions to tenant_admin role
INSERT INTO rbac_role_permissions (role_id, permission_id, effect)
SELECT 
  r.id as role_id,
  p.id as permission_id,
  'allow' as effect
FROM rbac_roles r
CROSS JOIN rbac_permissions p
WHERE r.name = 'tenant_admin'
  AND p.resource IN ('modality_pages', 'department_pages')
  AND p.action IN ('read', 'update', 'manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant update permission to marketing_manager role
INSERT INTO rbac_role_permissions (role_id, permission_id, effect)
SELECT 
  r.id as role_id,
  p.id as permission_id,
  'allow' as effect
FROM rbac_roles r
CROSS JOIN rbac_permissions p
WHERE r.name = 'marketing_manager'
  AND p.resource IN ('modality_pages', 'department_pages')
  AND p.action IN ('read', 'update')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant read permission to all other roles
INSERT INTO rbac_role_permissions (role_id, permission_id, effect)
SELECT 
  r.id as role_id,
  p.id as permission_id,
  'allow' as effect
FROM rbac_roles r
CROSS JOIN rbac_permissions p
WHERE r.name IN ('requester', 'manager', 'marketing')
  AND p.resource IN ('modality_pages', 'department_pages')
  AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;