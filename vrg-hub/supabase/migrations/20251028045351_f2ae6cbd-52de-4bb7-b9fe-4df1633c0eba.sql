-- Fix 1: Add unique constraint to departments.name
ALTER TABLE public.departments 
ADD CONSTRAINT departments_name_unique UNIQUE (name);

-- Fix 2: Add unique constraint to form_templates.name
ALTER TABLE public.form_templates 
ADD CONSTRAINT form_templates_name_unique UNIQUE (name);

-- Fix 3: Convert form_template department fields to foreign keys
-- Add new department_id column
ALTER TABLE public.form_templates 
ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- Migrate existing data from text department field to department_id
UPDATE public.form_templates ft
SET department_id = d.id
FROM public.departments d
WHERE ft.department = d.name;

-- Create index for better performance
CREATE INDEX idx_form_templates_department_id ON public.form_templates(department_id);

-- Fix 4: Add ENUM for form_type
CREATE TYPE form_type_enum AS ENUM ('hardware_request', 'department_request', 'toner_request', 'user_account_request', 'general');

-- Add new column with ENUM type
ALTER TABLE public.form_templates 
ADD COLUMN form_type_new form_type_enum;

-- Migrate existing data (with safe defaults)
UPDATE public.form_templates
SET form_type_new = CASE 
  WHEN form_type ILIKE '%hardware%' THEN 'hardware_request'::form_type_enum
  WHEN form_type ILIKE '%department%' THEN 'department_request'::form_type_enum
  WHEN form_type ILIKE '%toner%' THEN 'toner_request'::form_type_enum
  WHEN form_type ILIKE '%user%' OR form_type ILIKE '%account%' THEN 'user_account_request'::form_type_enum
  ELSE 'general'::form_type_enum
END;

-- Drop old column and rename new one
ALTER TABLE public.form_templates DROP COLUMN form_type;
ALTER TABLE public.form_templates RENAME COLUMN form_type_new TO form_type;

-- Make form_type NOT NULL with default
ALTER TABLE public.form_templates 
ALTER COLUMN form_type SET NOT NULL,
ALTER COLUMN form_type SET DEFAULT 'general'::form_type_enum;

-- Fix 5: Add validation constraint for request_types to ensure form_template matches department
-- This will be enforced via application logic and a check function
CREATE OR REPLACE FUNCTION validate_request_type_form_template()
RETURNS TRIGGER AS $$
BEGIN
  -- If form_template_id is set, verify it matches the department
  IF NEW.form_template_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM form_templates ft
      WHERE ft.id = NEW.form_template_id
      AND (ft.department_id = NEW.department_id OR ft.department_id IS NULL)
    ) THEN
      RAISE EXCEPTION 'Form template must belong to the same department as the request type';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_request_type_form_template_trigger
BEFORE INSERT OR UPDATE ON request_types
FOR EACH ROW
EXECUTE FUNCTION validate_request_type_form_template();