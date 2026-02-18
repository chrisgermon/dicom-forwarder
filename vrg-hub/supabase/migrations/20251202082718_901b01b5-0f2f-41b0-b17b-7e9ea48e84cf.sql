-- Add new reminder categories
INSERT INTO reminder_categories (name, description, icon, color, sort_order, is_active) VALUES
('Lease Renewal', 'Property lease renewals and rent reviews', 'Home', 'hsl(var(--chart-1))', 7, true),
('Accreditation Renewal', 'Accreditation and compliance renewals', 'Shield', 'hsl(var(--chart-2))', 8, true),
('Equipment Service', 'Equipment maintenance and servicing due dates', 'Wrench', 'hsl(var(--chart-3))', 9, true),
('Insurance Renewal', 'Insurance policy renewals', 'FileShield', 'hsl(var(--chart-4))', 10, true),
('Registration Renewal', 'Business and vehicle registrations', 'ClipboardCheck', 'hsl(var(--chart-5))', 11, true);

-- Add repeat_until_complete column to reminders table
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS repeat_until_complete boolean DEFAULT false;

-- Add last_notification_sent column to track daily repeat notifications
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS last_notification_sent timestamp with time zone;