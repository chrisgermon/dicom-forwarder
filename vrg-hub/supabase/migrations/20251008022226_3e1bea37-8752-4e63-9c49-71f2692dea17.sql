-- Add contact group fields to notifyre_fax_campaigns table
ALTER TABLE notifyre_fax_campaigns 
ADD COLUMN IF NOT EXISTS contact_group_id TEXT,
ADD COLUMN IF NOT EXISTS contact_group_name TEXT;