-- Add permission for managing reminder settings (types, advance notice options)
INSERT INTO rbac_permissions (resource, action, description)
VALUES ('reminder_settings', 'manage', 'Manage reminder types and advance notice options')
ON CONFLICT DO NOTHING;