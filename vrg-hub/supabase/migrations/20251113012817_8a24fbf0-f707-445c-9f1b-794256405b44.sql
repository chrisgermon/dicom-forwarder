-- Add newsletter owner tracking to cycles table
ALTER TABLE newsletter_cycles
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS owner_reminder_sent boolean DEFAULT false;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_newsletter_cycles_owner 
ON newsletter_cycles(owner_id);

-- Add index for due date queries (for daily reminders)
CREATE INDEX IF NOT EXISTS idx_newsletter_cycles_due_date 
ON newsletter_cycles(due_date) WHERE status IN ('active', 'in_review');

-- Add comment
COMMENT ON COLUMN newsletter_cycles.owner_id IS 'User who owns/manages this newsletter cycle and receives notifications';
COMMENT ON COLUMN newsletter_cycles.owner_reminder_sent IS 'Tracks if the 1-day-before reminder has been sent to the owner';