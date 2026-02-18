-- Drop the existing check constraint
ALTER TABLE public.clinic_setup_items DROP CONSTRAINT IF EXISTS clinic_setup_items_field_type_check;

-- Add updated check constraint with all field types used in the template
ALTER TABLE public.clinic_setup_items ADD CONSTRAINT clinic_setup_items_field_type_check 
CHECK (field_type = ANY (ARRAY['text', 'boolean', 'date', 'select', 'textarea', 'supplier', 'equipment', 'address', 'url', 'currency', 'number', 'file']));