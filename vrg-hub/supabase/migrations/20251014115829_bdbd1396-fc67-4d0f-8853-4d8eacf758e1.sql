-- Seed Vision Radiology department request form templates if missing
-- HR Request Form
INSERT INTO public.form_templates (name, department, form_type, description, is_active, fields)
SELECT 
  'HR Request Form',
  'HR',
  'department_request',
  'Human Resources request form for employee-related matters',
  true,
  '[
    {"id":"request_type","type":"select","label":"Request Type","required":true,"options":["New Hire","Termination","Leave Request","Benefits Inquiry","Policy Question","Training Request","Performance Review","Other"]},
    {"id":"employee_name","type":"text","label":"Employee Name","required":true,"placeholder":"Full name of employee"},
    {"id":"employee_id","type":"text","label":"Employee ID","required":false,"placeholder":"Employee identification number"},
    {"id":"department","type":"text","label":"Department","required":true,"placeholder":"Employee department"},
    {"id":"urgency","type":"select","label":"Urgency","required":true,"options":["Low","Medium","High","Critical"]},
    {"id":"description","type":"textarea","label":"Request Details","required":true,"placeholder":"Please provide detailed information about your HR request"},
    {"id":"effective_date","type":"date","label":"Effective Date","required":false}
  ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.form_templates WHERE name = 'HR Request Form' AND department = 'HR'
);

-- IT Service Desk Request Form
INSERT INTO public.form_templates (name, department, form_type, description, is_active, fields)
SELECT 
  'IT Service Desk Request Form',
  'IT',
  'department_request',
  'IT support and service desk requests',
  true,
  '[
    {"id":"request_category","type":"select","label":"Request Category","required":true,"options":["Hardware Issue","Software Issue","Network/Connectivity","Email/Communication","Access Request","New Equipment","Password Reset","Other"]},
    {"id":"priority","type":"select","label":"Priority","required":true,"options":["Low","Medium","High","Critical"]},
    {"id":"affected_user","type":"text","label":"Affected User","required":true,"placeholder":"Name of person experiencing the issue"},
    {"id":"location","type":"text","label":"Location/Office","required":true,"placeholder":"Physical location where issue is occurring"},
    {"id":"asset_tag","type":"text","label":"Asset Tag Number","required":false,"placeholder":"Equipment asset tag if applicable"},
    {"id":"issue_description","type":"textarea","label":"Issue Description","required":true,"placeholder":"Please describe the issue in detail, including any error messages"},
    {"id":"steps_to_reproduce","type":"textarea","label":"Steps to Reproduce","required":false,"placeholder":"How can we reproduce this issue?"},
    {"id":"business_impact","type":"textarea","label":"Business Impact","required":true,"placeholder":"How is this affecting your work?"}
  ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.form_templates WHERE name = 'IT Service Desk Request Form' AND department = 'IT'
);

-- Finance Request Form
INSERT INTO public.form_templates (name, department, form_type, description, is_active, fields)
SELECT 
  'Finance Request Form',
  'Finance',
  'department_request',
  'Finance department requests and inquiries',
  true,
  '[
    {"id":"request_type","type":"select","label":"Request Type","required":true,"options":["Budget Approval","Purchase Order","Expense Report","Invoice Query","Payment Request","Budget Transfer","Financial Report","Other"]},
    {"id":"cost_center","type":"text","label":"Cost Center","required":true,"placeholder":"Department cost center code"},
    {"id":"amount","type":"number","label":"Amount (AUD)","required":true,"placeholder":"0.00"},
    {"id":"gl_account","type":"text","label":"GL Account Code","required":false,"placeholder":"General ledger account code"},
    {"id":"vendor_supplier","type":"text","label":"Vendor/Supplier","required":false,"placeholder":"Name of vendor or supplier"},
    {"id":"description","type":"textarea","label":"Request Details","required":true,"placeholder":"Provide detailed information about your finance request"},
    {"id":"required_by_date","type":"date","label":"Required By Date","required":true}
  ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.form_templates WHERE name = 'Finance Request Form' AND department = 'Finance'
);

-- Accounts Payable Request Form
INSERT INTO public.form_templates (name, department, form_type, description, is_active, fields)
SELECT 
  'Accounts Payable Request Form',
  'Accounts Payable',
  'department_request',
  'Accounts payable and vendor payment requests',
  true,
  '[
    {"id":"request_type","type":"select","label":"Request Type","required":true,"options":["Invoice Payment","Vendor Setup","Payment Inquiry","Credit Note","Payment Schedule","Vendor Update","Other"]},
    {"id":"vendor_name","type":"text","label":"Vendor Name","required":true,"placeholder":"Name of vendor/supplier"},
    {"id":"invoice_number","type":"text","label":"Invoice Number","required":false,"placeholder":"Invoice reference number"},
    {"id":"invoice_amount","type":"number","label":"Invoice Amount (AUD)","required":true,"placeholder":"0.00"},
    {"id":"invoice_date","type":"date","label":"Invoice Date","required":false},
    {"id":"due_date","type":"date","label":"Payment Due Date","required":true},
    {"id":"cost_center","type":"text","label":"Cost Center","required":true,"placeholder":"Department cost center"},
    {"id":"description","type":"textarea","label":"Additional Details","required":true,"placeholder":"Provide any additional information about this payment request"}
  ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.form_templates WHERE name = 'Accounts Payable Request Form' AND department = 'Accounts Payable'
);

-- Facility Services Request Form
INSERT INTO public.form_templates (name, department, form_type, description, is_active, fields)
SELECT 
  'Facility Services Request Form',
  'Facility Services',
  'department_request',
  'Building maintenance and facility requests',
  true,
  '[
    {"id":"request_type","type":"select","label":"Request Type","required":true,"options":["Maintenance","Repairs","Cleaning","HVAC","Electrical","Plumbing","Security","Access Control","Other"]},
    {"id":"building_location","type":"text","label":"Building/Location","required":true,"placeholder":"Specific building or site"},
    {"id":"room_area","type":"text","label":"Room/Area","required":true,"placeholder":"Specific room number or area"},
    {"id":"priority","type":"select","label":"Priority","required":true,"options":["Low","Medium","High","Emergency"]},
    {"id":"issue_description","type":"textarea","label":"Issue Description","required":true,"placeholder":"Please describe the facility issue in detail"},
    {"id":"safety_concern","type":"select","label":"Safety Concern?","required":true,"options":["Yes","No"]},
    {"id":"preferred_date","type":"date","label":"Preferred Service Date","required":false}
  ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.form_templates WHERE name = 'Facility Services Request Form' AND department = 'Facility Services'
);

-- Office Services Request Form
INSERT INTO public.form_templates (name, department, form_type, description, is_active, fields)
SELECT 
  'Office Services Request Form',
  'Office Services',
  'department_request',
  'Office supplies and administrative services',
  true,
  '[
    {"id":"request_type","type":"select","label":"Request Type","required":true,"options":["Office Supplies","Furniture","Mail/Courier","Meeting Room Setup","Catering","Business Cards","Signage","Other"]},
    {"id":"delivery_location","type":"text","label":"Delivery Location","required":true,"placeholder":"Where should items be delivered?"},
    {"id":"quantity","type":"number","label":"Quantity","required":false,"placeholder":"Number of items needed"},
    {"id":"description","type":"textarea","label":"Item/Service Description","required":true,"placeholder":"Please describe what you need in detail"},
    {"id":"required_by_date","type":"date","label":"Required By Date","required":true},
    {"id":"urgency","type":"select","label":"Urgency","required":true,"options":["Standard","Urgent","Rush"]}
  ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.form_templates WHERE name = 'Office Services Request Form' AND department = 'Office Services'
);

-- Marketing Services Request Form (sub_department = Services)
INSERT INTO public.form_templates (name, department, sub_department, form_type, description, is_active, fields)
SELECT 
  'Marketing Services Request Form',
  'Marketing',
  'Services',
  'department_request',
  'Marketing services and campaign requests',
  true,
  '[
    {"id":"service_type","type":"select","label":"Service Type","required":true,"options":["Campaign Development","Creative Design","Digital Marketing","Content Creation","Event Support","Branding","Print Materials","Social Media","Other"]},
    {"id":"project_name","type":"text","label":"Project/Campaign Name","required":true,"placeholder":"Name of the marketing project"},
    {"id":"target_audience","type":"text","label":"Target Audience","required":true,"placeholder":"Who is the target audience?"},
    {"id":"budget_estimate","type":"number","label":"Budget Estimate (AUD)","required":false,"placeholder":"0.00"},
    {"id":"launch_date","type":"date","label":"Desired Launch Date","required":true},
    {"id":"objectives","type":"textarea","label":"Project Objectives","required":true,"placeholder":"What are the goals of this marketing initiative?"},
    {"id":"deliverables","type":"textarea","label":"Expected Deliverables","required":true,"placeholder":"What specific outputs do you need?"}
  ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.form_templates WHERE name = 'Marketing Services Request Form' AND department = 'Marketing' AND sub_department = 'Services'
);
