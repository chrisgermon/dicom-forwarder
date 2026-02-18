-- Update Technology Trainings form template with corrected "Eftpos" spelling
UPDATE form_templates
SET fields = jsonb_set(
  fields,
  '{0,options}',
  '["Request Kestral training", "Request PACS training", "Request Eftpos training", "Request CT Canon Apps training", "Request CT Siemens Apps training", "Request MRI Siemens Apps training", "Request X-ray Apps Training", "Request US Canon Apps training", "Request US Philips Apps training", "Request US GE Apps training", "Request Lumicare training"]'::jsonb
)
WHERE department = 'Technology Trainings'
AND fields->0->>'id' = 'request_type';

-- Ensure all templates have the correct request types as per user requirements
-- Facility Services template
UPDATE form_templates
SET fields = jsonb_set(
  fields,
  '{0,options}',
  '["General maintenance", "Airconditioning", "Lighting", "Cleaning", "Merchandise", "Other"]'::jsonb
)
WHERE department = 'Facility Services'
AND fields->0->>'id' = 'request_type';

-- Office Services template  
UPDATE form_templates
SET fields = jsonb_set(
  fields,
  '{0,options}',
  '["Print and Post", "Couriers and Deliveries", "Stationary Requests", "Marketing and Print material request"]'::jsonb
)
WHERE department = 'Office Services'
AND fields->0->>'id' = 'request_type';

-- Accounts Payable template
UPDATE form_templates
SET fields = jsonb_set(
  fields,
  '{0,options}',
  '["EFT payment", "Staff Reimbursement request", "General Inquiry"]'::jsonb
)
WHERE department = 'Accounts Payable'
AND fields->0->>'id' = 'request_type';

-- Finance template
UPDATE form_templates
SET fields = jsonb_set(
  fields,
  '{0,options}',
  '["Statement request", "Payroll issues"]'::jsonb
)
WHERE department = 'Finance'
AND fields->0->>'id' = 'request_type';

-- IT Service Desk template
UPDATE form_templates
SET fields = jsonb_set(
  fields,
  '{0,options}',
  '["Get IT help", "Access mail Inbox", "Remote Access - VPN", "Computer Support", "License Support", "Request New software", "Request New hardware", "Mobile Device Issues", "Permission acces", "Reset Password", "Printing/printer Issue", "Work from home equipment", "General Support"]'::jsonb
)
WHERE department = 'IT'
AND fields->0->>'id' = 'request_type';

-- HR template
UPDATE form_templates
SET fields = jsonb_set(
  fields,
  '{0,options}',
  '["Incident form submission", "Patient complaint", "Staff complaint", "Report HR compliance", "General support"]'::jsonb
)
WHERE department = 'HR'
AND fields->0->>'id' = 'request_type';

-- Marketing template
UPDATE form_templates
SET fields = jsonb_set(
  fields,
  '{0,options}',
  '["Request MLO to see referrer", "Referer complaint"]'::jsonb
)
WHERE department = 'Marketing'
AND fields->0->>'id' = 'request_type';