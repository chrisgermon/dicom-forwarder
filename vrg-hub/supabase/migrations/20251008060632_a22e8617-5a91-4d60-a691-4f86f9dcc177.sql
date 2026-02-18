-- Drop all helpdesk-related tables (CASCADE will handle dependencies)
DROP TABLE IF EXISTS helpdesk_ticket_attachments CASCADE;
DROP TABLE IF EXISTS helpdesk_ticket_comments CASCADE;
DROP TABLE IF EXISTS helpdesk_ticket_status_history CASCADE;
DROP TABLE IF EXISTS helpdesk_tickets CASCADE;
DROP TABLE IF EXISTS helpdesk_macros CASCADE;
DROP TABLE IF EXISTS helpdesk_automation_rules CASCADE;
DROP TABLE IF EXISTS helpdesk_sla_configs CASCADE;
DROP TABLE IF EXISTS helpdesk_email_templates CASCADE;
DROP TABLE IF EXISTS helpdesk_department_managers CASCADE;
DROP TABLE IF EXISTS helpdesk_sub_departments CASCADE;
DROP TABLE IF EXISTS helpdesk_departments CASCADE;

-- Drop all helpdesk-related functions (CASCADE will handle trigger dependencies)
DROP FUNCTION IF EXISTS generate_ticket_number() CASCADE;
DROP FUNCTION IF EXISTS set_ticket_number() CASCADE;
DROP FUNCTION IF EXISTS track_ticket_status_change() CASCADE;
DROP FUNCTION IF EXISTS calculate_ticket_sla() CASCADE;
DROP FUNCTION IF EXISTS update_first_response() CASCADE;
DROP FUNCTION IF EXISTS notify_new_helpdesk_ticket() CASCADE;
DROP FUNCTION IF EXISTS notify_helpdesk_ticket_status() CASCADE;
DROP FUNCTION IF EXISTS notify_helpdesk_ticket_assignment() CASCADE;
DROP FUNCTION IF EXISTS notify_helpdesk_ticket_comment() CASCADE;
DROP FUNCTION IF EXISTS can_access_helpdesk_department(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS seed_helpdesk_departments(uuid) CASCADE;

-- Drop helpdesk-related storage bucket
DELETE FROM storage.objects WHERE bucket_id = 'helpdesk-attachments';
DELETE FROM storage.buckets WHERE id = 'helpdesk-attachments';