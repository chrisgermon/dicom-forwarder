-- Add permission for managing handler groups
INSERT INTO rbac_permissions (resource, action, description)
VALUES ('handler_groups', 'manage', 'Manage request handler groups')
ON CONFLICT DO NOTHING;

-- Grant this permission to super_admin role by default
INSERT INTO rbac_role_permissions (role_id, permission_id, effect)
SELECT r.id, p.id, 'allow'
FROM rbac_roles r
CROSS JOIN rbac_permissions p
WHERE r.name = 'super_admin'
AND p.resource = 'handler_groups'
AND p.action = 'manage'
ON CONFLICT DO NOTHING;