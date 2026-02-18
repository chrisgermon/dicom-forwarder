-- Add all necessary columns to tickets table for unified request system

-- Add columns if they don't exist
DO $$ 
BEGIN
  -- Add source column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'source') THEN
    ALTER TABLE tickets ADD COLUMN source text DEFAULT 'ticket';
  END IF;

  -- Add request_type_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'request_type_id') THEN
    ALTER TABLE tickets ADD COLUMN request_type_id uuid REFERENCES request_types(id);
  END IF;

  -- Add category_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'category_id') THEN
    ALTER TABLE tickets ADD COLUMN category_id uuid REFERENCES request_categories(id);
  END IF;

  -- Add form_template_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'form_template_id') THEN
    ALTER TABLE tickets ADD COLUMN form_template_id uuid REFERENCES form_templates(id);
  END IF;

  -- Add business_justification
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'business_justification') THEN
    ALTER TABLE tickets ADD COLUMN business_justification text;
  END IF;

  -- Add currency
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'currency') THEN
    ALTER TABLE tickets ADD COLUMN currency text DEFAULT 'USD';
  END IF;

  -- Add total_amount
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'total_amount') THEN
    ALTER TABLE tickets ADD COLUMN total_amount numeric;
  END IF;

  -- Add expected_delivery_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'expected_delivery_date') THEN
    ALTER TABLE tickets ADD COLUMN expected_delivery_date timestamp with time zone;
  END IF;

  -- Add manager approval fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'manager_id') THEN
    ALTER TABLE tickets ADD COLUMN manager_id uuid;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'manager_approved_at') THEN
    ALTER TABLE tickets ADD COLUMN manager_approved_at timestamp with time zone;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'manager_approval_notes') THEN
    ALTER TABLE tickets ADD COLUMN manager_approval_notes text;
  END IF;

  -- Add admin approval fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'admin_id') THEN
    ALTER TABLE tickets ADD COLUMN admin_id uuid;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'admin_approved_at') THEN
    ALTER TABLE tickets ADD COLUMN admin_approved_at timestamp with time zone;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'admin_approval_notes') THEN
    ALTER TABLE tickets ADD COLUMN admin_approval_notes text;
  END IF;

  -- Add decline fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'declined_by') THEN
    ALTER TABLE tickets ADD COLUMN declined_by uuid;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'declined_at') THEN
    ALTER TABLE tickets ADD COLUMN declined_at timestamp with time zone;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'decline_reason') THEN
    ALTER TABLE tickets ADD COLUMN decline_reason text;
  END IF;

  -- Add clinic_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'clinic_name') THEN
    ALTER TABLE tickets ADD COLUMN clinic_name text;
  END IF;

  -- Add cc_emails
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'cc_emails') THEN
    ALTER TABLE tickets ADD COLUMN cc_emails text[] DEFAULT ARRAY[]::text[];
  END IF;

END $$;

-- Drop and recreate check constraints to accept all values
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check CHECK (status IN (
  'draft', 'submitted', 'pending_manager_approval', 'pending_admin_approval',
  'approved', 'declined', 'ordered', 'delivered', 'cancelled',
  'inbox', 'in_progress', 'awaiting_information', 'on_hold', 'completed'
));

ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_priority_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_priority_check CHECK (priority IN (
  'low', 'Low', 'medium', 'Medium', 'high', 'High', 'urgent', 'Urgent'
));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_request_type_id ON tickets(request_type_id);
CREATE INDEX IF NOT EXISTS idx_tickets_category_id ON tickets(category_id);
CREATE INDEX IF NOT EXISTS idx_tickets_form_template_id ON tickets(form_template_id);
CREATE INDEX IF NOT EXISTS idx_tickets_source ON tickets(source);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);

-- Migrate data from hardware_requests to tickets if not already done
INSERT INTO tickets (
  id, user_id, title, description, business_justification, clinic_name,
  priority, status, total_amount, currency, expected_delivery_date,
  manager_id, manager_approved_at, manager_approval_notes,
  admin_id, admin_approved_at, admin_approval_notes,
  declined_by, declined_at, decline_reason,
  assigned_to, brand_id, location_id, cc_emails,
  source, created_at, updated_at
)
SELECT 
  hr.id, hr.user_id, hr.title, hr.description, hr.business_justification, hr.clinic_name,
  hr.priority, hr.status, hr.total_amount, hr.currency, hr.expected_delivery_date,
  hr.manager_id, hr.manager_approved_at, hr.manager_approval_notes,
  hr.admin_id, hr.admin_approved_at, hr.admin_approval_notes,
  hr.declined_by, hr.declined_at, hr.decline_reason,
  hr.assigned_to, hr.brand_id, hr.location_id, hr.cc_emails,
  'hardware', hr.created_at, hr.updated_at
FROM hardware_requests hr
WHERE NOT EXISTS (SELECT 1 FROM tickets t WHERE t.id = hr.id);