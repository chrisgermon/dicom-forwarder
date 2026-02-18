-- Add icon column to request_types table
ALTER TABLE request_types
ADD COLUMN IF NOT EXISTS icon text;

-- Add icon column to request_categories table if it doesn't exist
ALTER TABLE request_categories
ADD COLUMN IF NOT EXISTS icon text;

-- Add comment for documentation
COMMENT ON COLUMN request_types.icon IS 'Lucide React icon name for UI display';
COMMENT ON COLUMN request_categories.icon IS 'Lucide React icon name for UI display';