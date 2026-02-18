-- Create directory categories table
CREATE TABLE directory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_type TEXT NOT NULL CHECK (category_type IN ('clinic', 'contact')),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE directory_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for directory_categories
CREATE POLICY "Everyone can view active categories"
  ON directory_categories
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage categories"
  ON directory_categories
  FOR ALL
  USING (has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Add category_id to directory_clinics
ALTER TABLE directory_clinics ADD COLUMN category_id UUID REFERENCES directory_categories(id) ON DELETE SET NULL;

-- Add category_id to directory_contacts  
ALTER TABLE directory_contacts ADD COLUMN category_id UUID REFERENCES directory_categories(id) ON DELETE SET NULL;

-- Insert default categories for existing brands
INSERT INTO directory_categories (brand_id, name, category_type, sort_order)
SELECT id, 'Melbourne Clinics', 'clinic', 1 FROM brands WHERE is_active = true;

INSERT INTO directory_categories (brand_id, name, category_type, sort_order)
SELECT id, 'Regional Clinics', 'clinic', 2 FROM brands WHERE is_active = true;

INSERT INTO directory_categories (brand_id, name, category_type, sort_order)
SELECT id, 'Contacts', 'contact', 3 FROM brands WHERE is_active = true;

-- Update existing clinics to link to categories
UPDATE directory_clinics dc
SET category_id = (
  SELECT id FROM directory_categories cat
  WHERE cat.brand_id = dc.brand_id 
  AND cat.category_type = 'clinic'
  AND cat.name = CASE 
    WHEN dc.region = 'melbourne' THEN 'Melbourne Clinics'
    WHEN dc.region = 'regional' THEN 'Regional Clinics'
    ELSE 'Melbourne Clinics'
  END
  LIMIT 1
);

-- Update existing contacts to link to categories
UPDATE directory_contacts dc
SET category_id = (
  SELECT id FROM directory_categories cat
  WHERE cat.brand_id = dc.brand_id 
  AND cat.category_type = 'contact'
  LIMIT 1
);

-- Add triggers for updated_at
CREATE TRIGGER update_directory_categories_updated_at
  BEFORE UPDATE ON directory_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();