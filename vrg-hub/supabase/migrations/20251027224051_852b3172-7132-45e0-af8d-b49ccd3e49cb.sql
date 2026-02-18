-- Link request_types to form_templates for custom fields
ALTER TABLE public.request_types
ADD COLUMN IF NOT EXISTS form_template_id uuid REFERENCES public.form_templates(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_request_types_form_template ON public.request_types(form_template_id);

-- Create a default form template for hardware requests with justification field
INSERT INTO public.form_templates (name, description, form_type, fields, is_active)
VALUES (
  'Hardware Request Form',
  'Standard hardware request form with business justification',
  'hardware_request',
  '[
    {
      "id": "title",
      "type": "text",
      "label": "Request Title",
      "placeholder": "Brief description of hardware needed",
      "required": true
    },
    {
      "id": "description",
      "type": "textarea",
      "label": "Detailed Description",
      "placeholder": "Provide detailed information about your request",
      "required": false
    },
    {
      "id": "business_justification",
      "type": "textarea",
      "label": "Business Justification",
      "placeholder": "Explain why this hardware is needed and how it will benefit the organization",
      "required": true
    },
    {
      "id": "priority",
      "type": "select",
      "label": "Priority",
      "options": ["low", "medium", "high", "urgent"],
      "required": true
    }
  ]'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- Link the hardware request type to the form template
UPDATE public.request_types
SET form_template_id = (
  SELECT id FROM public.form_templates 
  WHERE form_type = 'hardware_request' 
  LIMIT 1
)
WHERE slug = 'hardware-request';