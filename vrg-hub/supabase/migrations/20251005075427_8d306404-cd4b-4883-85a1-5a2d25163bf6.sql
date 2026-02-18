-- Add icon and is_critical fields to system_statuses table
ALTER TABLE system_statuses 
ADD COLUMN IF NOT EXISTS icon TEXT,
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false;