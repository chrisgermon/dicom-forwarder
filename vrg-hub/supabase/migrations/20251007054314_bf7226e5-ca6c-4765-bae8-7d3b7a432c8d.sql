-- Update default layout_config to be empty for new companies
ALTER TABLE company_home_pages 
ALTER COLUMN layout_config SET DEFAULT '{"widgets": []}'::jsonb;

-- Reset Pinnacle Medical Imaging's home page to blank
-- First, find the company_id for Pinnacle Medical Imaging
UPDATE company_home_pages
SET layout_config = '{"widgets": []}'::jsonb,
    updated_at = now()
WHERE company_id = '977643d1-102e-49f5-ae6e-0980651e80c0';

-- If no record exists for this company, we don't need to do anything
-- as the new default will apply when it's created