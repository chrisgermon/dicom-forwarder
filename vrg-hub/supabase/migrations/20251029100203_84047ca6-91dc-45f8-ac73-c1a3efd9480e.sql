-- First, remove foreign key references from tickets
UPDATE tickets SET category_id = NULL WHERE category_id IS NOT NULL;
UPDATE tickets SET request_type_id = NULL WHERE request_type_id IS NOT NULL;

-- Clean up all existing request categories and types
DELETE FROM request_categories;
DELETE FROM request_types;

-- Insert the 3 main request types
INSERT INTO request_types (name, slug, description, icon, is_active) VALUES
('IT Service Desk', 'it-service-desk', 'Information technology support and services', 'Laptop', true),
('HR', 'hr', 'Human resources support and compliance', 'Users', true),
('Marketing', 'marketing', 'Marketing requests and referrer relations', 'Megaphone', true);

-- Insert IT Service Desk categories
INSERT INTO request_categories (name, slug, request_type_id, icon, is_active, sort_order)
SELECT 'Get IT help', 'get-it-help', id, 'HelpCircle', true, 1 FROM request_types WHERE slug = 'it-service-desk'
UNION ALL
SELECT 'Access mail Inbox', 'access-mail-inbox', id, 'Mail', true, 2 FROM request_types WHERE slug = 'it-service-desk'
UNION ALL
SELECT 'Remote Access - VPN', 'remote-access-vpn', id, 'Globe', true, 3 FROM request_types WHERE slug = 'it-service-desk'
UNION ALL
SELECT 'Computer Support', 'computer-support', id, 'Monitor', true, 4 FROM request_types WHERE slug = 'it-service-desk'
UNION ALL
SELECT 'License Support', 'license-support', id, 'Key', true, 5 FROM request_types WHERE slug = 'it-service-desk'
UNION ALL
SELECT 'Request New software', 'request-new-software', id, 'Package', true, 6 FROM request_types WHERE slug = 'it-service-desk'
UNION ALL
SELECT 'Request New hardware', 'request-new-hardware', id, 'HardDrive', true, 7 FROM request_types WHERE slug = 'it-service-desk'
UNION ALL
SELECT 'Mobile Device Issues', 'mobile-device-issues', id, 'Smartphone', true, 8 FROM request_types WHERE slug = 'it-service-desk'
UNION ALL
SELECT 'Permission acces', 'permission-acces', id, 'Lock', true, 9 FROM request_types WHERE slug = 'it-service-desk'
UNION ALL
SELECT 'Reset Password', 'reset-password', id, 'KeyRound', true, 10 FROM request_types WHERE slug = 'it-service-desk'
UNION ALL
SELECT 'Printing/printer Issue', 'printing-printer-issue', id, 'Printer', true, 11 FROM request_types WHERE slug = 'it-service-desk'
UNION ALL
SELECT 'Work from home equipment', 'work-from-home-equipment', id, 'Home', true, 12 FROM request_types WHERE slug = 'it-service-desk'
UNION ALL
SELECT 'General Support', 'general-support-it', id, 'MessageSquare', true, 13 FROM request_types WHERE slug = 'it-service-desk';

-- Insert HR categories
INSERT INTO request_categories (name, slug, request_type_id, icon, is_active, sort_order)
SELECT 'Incident form submission', 'incident-form-submission', id, 'AlertTriangle', true, 1 FROM request_types WHERE slug = 'hr'
UNION ALL
SELECT 'Patient complaint', 'patient-complaint', id, 'UserX', true, 2 FROM request_types WHERE slug = 'hr'
UNION ALL
SELECT 'Staff complaint', 'staff-complaint', id, 'Users', true, 3 FROM request_types WHERE slug = 'hr'
UNION ALL
SELECT 'Report HR compliance', 'report-hr-compliance', id, 'FileText', true, 4 FROM request_types WHERE slug = 'hr'
UNION ALL
SELECT 'General support', 'general-support-hr', id, 'MessageCircle', true, 5 FROM request_types WHERE slug = 'hr';

-- Insert Marketing categories
INSERT INTO request_categories (name, slug, request_type_id, icon, is_active, sort_order)
SELECT 'Request MLO to see referrer', 'request-mlo-to-see-referrer', id, 'UserPlus', true, 1 FROM request_types WHERE slug = 'marketing'
UNION ALL
SELECT 'Referer complaint', 'referer-complaint', id, 'AlertCircle', true, 2 FROM request_types WHERE slug = 'marketing'
UNION ALL
SELECT 'New Marketing Blast', 'new-marketing-blast', id, 'Send', true, 3 FROM request_types WHERE slug = 'marketing';