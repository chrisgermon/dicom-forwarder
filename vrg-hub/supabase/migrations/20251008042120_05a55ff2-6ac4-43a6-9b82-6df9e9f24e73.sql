-- Add document_path column to campaigns table
ALTER TABLE notifyre_fax_campaigns 
ADD COLUMN IF NOT EXISTS document_path text;

-- Remove document columns from fax logs since we're storing at campaign level
ALTER TABLE notifyre_fax_logs 
DROP COLUMN IF EXISTS document_path,
DROP COLUMN IF EXISTS document_url,
DROP COLUMN IF EXISTS document_id;