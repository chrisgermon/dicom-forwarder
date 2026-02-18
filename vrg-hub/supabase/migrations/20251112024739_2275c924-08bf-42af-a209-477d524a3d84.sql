-- Add brand_id and location_id columns to incidents table
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id),
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

-- Make clinic column nullable since we're transitioning to brand_id/location_id
ALTER TABLE incidents ALTER COLUMN clinic DROP NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_incidents_brand_id ON incidents(brand_id);
CREATE INDEX IF NOT EXISTS idx_incidents_location_id ON incidents(location_id);