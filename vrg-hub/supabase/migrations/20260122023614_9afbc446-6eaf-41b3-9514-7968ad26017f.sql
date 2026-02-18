-- Add executive role
INSERT INTO rbac_roles (name, description, is_system_role)
VALUES ('executive', 'Executive - Access to executive dashboard and high-level analytics', true)
ON CONFLICT (name) DO NOTHING;

-- Add executive_dashboard permission
INSERT INTO rbac_permissions (resource, action, description)
VALUES ('executive_dashboard', 'read', 'Access Executive Dashboard and analytics')
ON CONFLICT (resource, action) DO NOTHING;

-- Link the permission to the executive role
INSERT INTO rbac_role_permissions (role_id, permission_id, effect)
SELECT r.id, p.id, 'allow'
FROM rbac_roles r, rbac_permissions p
WHERE r.name = 'executive' 
  AND p.resource = 'executive_dashboard' 
  AND p.action = 'read'
ON CONFLICT DO NOTHING;

-- Also grant executive_dashboard permission to super_admin role
INSERT INTO rbac_role_permissions (role_id, permission_id, effect)
SELECT r.id, p.id, 'allow'
FROM rbac_roles r, rbac_permissions p
WHERE r.name = 'super_admin' 
  AND p.resource = 'executive_dashboard' 
  AND p.action = 'read'
ON CONFLICT DO NOTHING;