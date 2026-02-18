-- Insert blank home page record for Pinnacle Medical Imaging if it doesn't exist
INSERT INTO company_home_pages (company_id, layout_config, quick_actions)
VALUES (
  '977643d1-102e-49f5-ae6e-0980651e80c0',
  '{"widgets": []}'::jsonb,
  '[]'::jsonb
)
ON CONFLICT (company_id) DO UPDATE
SET layout_config = '{"widgets": []}'::jsonb,
    updated_at = now();