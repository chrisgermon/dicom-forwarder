-- Add form_required boolean to request_categories
ALTER TABLE public.request_categories
ADD COLUMN IF NOT EXISTS form_required boolean DEFAULT true;

-- Update existing categories to mark those with forms as required
UPDATE public.request_categories
SET form_required = (form_template_id IS NOT NULL);

-- Clean up form_templates: remove redundant department fields
ALTER TABLE public.form_templates
DROP COLUMN IF EXISTS department,
DROP COLUMN IF EXISTS sub_department,
DROP COLUMN IF EXISTS department_id;

-- Update form_templates settings to remove redundant category info
UPDATE public.form_templates
SET settings = settings - 'request_type_id' - 'category_name' - 'category_slug'
WHERE settings IS NOT NULL;