-- Add section/subdepartment support to newsletter tables
ALTER TABLE newsletter_assignments 
ADD COLUMN IF NOT EXISTS section TEXT,
ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false;

ALTER TABLE newsletter_submissions
ADD COLUMN IF NOT EXISTS section TEXT,
ADD COLUMN IF NOT EXISTS sections_data JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the sections_data structure
COMMENT ON COLUMN newsletter_submissions.sections_data IS 'Array of {section: string, content: string, is_required: boolean} objects';

-- Update existing assignments to have section null (will be handled by application)
UPDATE newsletter_assignments SET section = NULL WHERE section IS NULL;