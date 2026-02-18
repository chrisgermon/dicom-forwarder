-- Add document_url field to notifyre_fax_logs table
ALTER TABLE notifyre_fax_logs 
ADD COLUMN IF NOT EXISTS document_url TEXT,
ADD COLUMN IF NOT EXISTS document_id TEXT;