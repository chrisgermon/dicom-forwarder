-- Add brand and location tracking to newsletter assignments
ALTER TABLE newsletter_assignments
ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES brands(id),
ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES locations(id);

-- Add brand and location tracking to newsletter submissions
ALTER TABLE newsletter_submissions
ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES brands(id),
ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES locations(id);

-- Add flag to department templates to indicate which require brand/location
ALTER TABLE department_section_templates
ADD COLUMN IF NOT EXISTS requires_brand_location boolean DEFAULT false;

-- Update Technical Partners template to require brand/location
UPDATE department_section_templates
SET requires_brand_location = true
WHERE department_name = 'Technical Partners';

-- Drop old unique constraint on newsletter_assignments if it exists
ALTER TABLE newsletter_assignments
DROP CONSTRAINT IF EXISTS newsletter_assignments_cycle_id_contributor_id_departmen_key;

-- Create new unique constraint that includes brand_id and location_id
-- This allows multiple assignments per contributor for different brands/locations
ALTER TABLE newsletter_assignments
ADD CONSTRAINT newsletter_assignments_unique_assignment 
UNIQUE (cycle_id, contributor_id, department, brand_id, location_id);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_newsletter_assignments_brand 
ON newsletter_assignments(brand_id);

CREATE INDEX IF NOT EXISTS idx_newsletter_assignments_location 
ON newsletter_assignments(location_id);

CREATE INDEX IF NOT EXISTS idx_newsletter_submissions_brand 
ON newsletter_submissions(brand_id);

CREATE INDEX IF NOT EXISTS idx_newsletter_submissions_location 
ON newsletter_submissions(location_id);

-- Add comment explaining the brand/location fields
COMMENT ON COLUMN newsletter_assignments.brand_id IS 'For departments requiring per-company submissions (e.g., Technical Partners)';
COMMENT ON COLUMN newsletter_assignments.location_id IS 'For departments requiring per-location submissions (e.g., Technical Partners)';
COMMENT ON COLUMN newsletter_submissions.brand_id IS 'Tracks which company this submission is for';
COMMENT ON COLUMN newsletter_submissions.location_id IS 'Tracks which location this submission is for';