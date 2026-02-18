-- Fix the hardware request form template to use proper field option format
UPDATE public.form_templates
SET fields = '[
  {
    "id": "title",
    "type": "text",
    "label": "Request Title",
    "placeholder": "Brief description of hardware needed",
    "required": true,
    "order": 1
  },
  {
    "id": "description",
    "type": "textarea",
    "label": "Detailed Description",
    "placeholder": "Provide detailed information about your request",
    "required": false,
    "order": 2
  },
  {
    "id": "business_justification",
    "type": "textarea",
    "label": "Business Justification",
    "placeholder": "Explain why this hardware is needed and how it will benefit the organization",
    "required": true,
    "order": 3
  },
  {
    "id": "priority",
    "type": "select",
    "label": "Priority",
    "required": true,
    "order": 4,
    "options": [
      {"label": "Low", "value": "low"},
      {"label": "Medium", "value": "medium"},
      {"label": "High", "value": "high"},
      {"label": "Urgent", "value": "urgent"}
    ]
  }
]'::jsonb
WHERE form_type = 'hardware_request';