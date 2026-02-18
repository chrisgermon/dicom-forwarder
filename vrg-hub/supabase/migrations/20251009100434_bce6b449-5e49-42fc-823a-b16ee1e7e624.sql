-- Add 'cycle_created' to the newsletter_reminder_type enum
ALTER TYPE newsletter_reminder_type ADD VALUE IF NOT EXISTS 'cycle_created';