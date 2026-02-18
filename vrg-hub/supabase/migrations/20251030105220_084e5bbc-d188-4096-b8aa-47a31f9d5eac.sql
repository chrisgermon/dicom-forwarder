-- Drop the existing status constraint first to allow updates
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;

-- Update all existing tickets to use the new simplified statuses
UPDATE tickets 
SET status = CASE
  WHEN status IN ('draft', 'inbox', 'submitted', 'pending_manager_approval', 'pending_admin_approval', 'approved', 'awaiting_information', 'on_hold') THEN 'open'
  WHEN status IN ('declined', 'cancelled', 'ordered', 'delivered') THEN 'completed'
  WHEN status = 'in_progress' THEN 'in_progress'
  WHEN status = 'completed' THEN 'completed'
  ELSE 'open'
END;

-- Add the new simplified constraint
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
CHECK (status = ANY (ARRAY['open'::text, 'in_progress'::text, 'completed'::text]));