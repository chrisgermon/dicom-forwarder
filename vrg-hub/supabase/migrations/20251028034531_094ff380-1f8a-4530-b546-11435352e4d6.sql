-- Add form_template_id to request_categories
ALTER TABLE public.request_categories 
ADD COLUMN form_template_id uuid REFERENCES public.form_templates(id) ON DELETE SET NULL;

-- Create a default form template for Facility Services categories
INSERT INTO public.form_templates (
  name,
  description,
  form_type,
  fields,
  is_active
) VALUES 
  ('General Maintenance Form', 'Default form for General Maintenance requests', 'facility_services', 
   '[
     {"id":"description","type":"textarea","label":"Issue Description","required":true,"placeholder":"Please describe the maintenance issue in detail"},
     {"id":"location","type":"text","label":"Location/Room Number","required":true,"placeholder":"e.g., Room 302, Building A"},
     {"id":"urgency","type":"select","label":"Urgency Level","required":true,"options":["Low","Medium","High","Critical"]},
     {"id":"preferred_date","type":"date","label":"Preferred Service Date","required":false}
   ]'::jsonb, true),
  
  ('Airconditioning Form', 'Default form for Airconditioning requests', 'facility_services',
   '[
     {"id":"description","type":"textarea","label":"Issue Description","required":true,"placeholder":"Describe the AC issue"},
     {"id":"location","type":"text","label":"Location/Room Number","required":true,"placeholder":"e.g., Room 302, Building A"},
     {"id":"urgency","type":"select","label":"Urgency Level","required":true,"options":["Low","Medium","High","Critical"]},
     {"id":"temperature","type":"text","label":"Current Temperature (if known)","required":false}
   ]'::jsonb, true),
  
  ('Lighting Form', 'Default form for Lighting requests', 'facility_services',
   '[
     {"id":"description","type":"textarea","label":"Issue Description","required":true,"placeholder":"Describe the lighting issue"},
     {"id":"location","type":"text","label":"Location/Room Number","required":true,"placeholder":"e.g., Room 302, Building A"},
     {"id":"urgency","type":"select","label":"Urgency Level","required":true,"options":["Low","Medium","High","Critical"]},
     {"id":"light_type","type":"text","label":"Type of Light Fixture","required":false}
   ]'::jsonb, true),
  
  ('Cleaning Form', 'Default form for Cleaning requests', 'facility_services',
   '[
     {"id":"description","type":"textarea","label":"Cleaning Request Details","required":true,"placeholder":"Describe what needs to be cleaned"},
     {"id":"location","type":"text","label":"Location/Room Number","required":true,"placeholder":"e.g., Room 302, Building A"},
     {"id":"urgency","type":"select","label":"Urgency Level","required":true,"options":["Low","Medium","High","Critical"]},
     {"id":"preferred_date","type":"date","label":"Preferred Cleaning Date","required":false}
   ]'::jsonb, true),
  
  ('Merchandise Form', 'Default form for Merchandise requests', 'facility_services',
   '[
     {"id":"item_name","type":"text","label":"Item/Merchandise Name","required":true,"placeholder":"What merchandise do you need?"},
     {"id":"quantity","type":"number","label":"Quantity","required":true},
     {"id":"description","type":"textarea","label":"Additional Details","required":false,"placeholder":"Any specific requirements"},
     {"id":"location","type":"text","label":"Delivery Location","required":true,"placeholder":"Where should this be delivered?"}
   ]'::jsonb, true),
  
  ('Other Facility Services Form', 'Default form for Other facility service requests', 'facility_services',
   '[
     {"id":"request_type","type":"text","label":"Type of Request","required":true,"placeholder":"What type of service do you need?"},
     {"id":"description","type":"textarea","label":"Request Details","required":true,"placeholder":"Please describe your request"},
     {"id":"location","type":"text","label":"Location","required":true,"placeholder":"e.g., Room 302, Building A"},
     {"id":"urgency","type":"select","label":"Urgency Level","required":true,"options":["Low","Medium","High","Critical"]}
   ]'::jsonb, true);

-- Link each category to its corresponding form template
UPDATE public.request_categories rc
SET form_template_id = ft.id
FROM public.form_templates ft
WHERE rc.request_type_id = '0920ef52-11b0-4e6d-b433-bfb57b9a8fb5'
  AND rc.name = 'General Maintenance'
  AND ft.name = 'General Maintenance Form';

UPDATE public.request_categories rc
SET form_template_id = ft.id
FROM public.form_templates ft
WHERE rc.request_type_id = '0920ef52-11b0-4e6d-b433-bfb57b9a8fb5'
  AND rc.name = 'Airconditioning'
  AND ft.name = 'Airconditioning Form';

UPDATE public.request_categories rc
SET form_template_id = ft.id
FROM public.form_templates ft
WHERE rc.request_type_id = '0920ef52-11b0-4e6d-b433-bfb57b9a8fb5'
  AND rc.name = 'Lighting'
  AND ft.name = 'Lighting Form';

UPDATE public.request_categories rc
SET form_template_id = ft.id
FROM public.form_templates ft
WHERE rc.request_type_id = '0920ef52-11b0-4e6d-b433-bfb57b9a8fb5'
  AND rc.name = 'Cleaning'
  AND ft.name = 'Cleaning Form';

UPDATE public.request_categories rc
SET form_template_id = ft.id
FROM public.form_templates ft
WHERE rc.request_type_id = '0920ef52-11b0-4e6d-b433-bfb57b9a8fb5'
  AND rc.name = 'Merchandise'
  AND ft.name = 'Merchandise Form';

UPDATE public.request_categories rc
SET form_template_id = ft.id
FROM public.form_templates ft
WHERE rc.request_type_id = '0920ef52-11b0-4e6d-b433-bfb57b9a8fb5'
  AND rc.name = 'Other'
  AND ft.name = 'Other Facility Services Form';