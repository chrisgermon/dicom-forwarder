-- Create function to seed default helpdesk departments for a company
CREATE OR REPLACE FUNCTION seed_helpdesk_departments(_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dept_facility_services uuid;
  dept_office_services uuid;
  dept_accounts_payable uuid;
  dept_finance uuid;
  dept_technology_trainings uuid;
  dept_it_service_desk uuid;
  dept_hr uuid;
  dept_marketing uuid;
BEGIN
  -- Insert departments and capture their IDs
  INSERT INTO helpdesk_departments (company_id, name, description, sort_order, is_active)
  VALUES (_company_id, 'Facility Services', 'Facility and maintenance services', 1, true)
  RETURNING id INTO dept_facility_services;

  INSERT INTO helpdesk_departments (company_id, name, description, sort_order, is_active)
  VALUES (_company_id, 'Office Services', 'Office and administrative services', 2, true)
  RETURNING id INTO dept_office_services;

  INSERT INTO helpdesk_departments (company_id, name, description, sort_order, is_active)
  VALUES (_company_id, 'Accounts Payable', 'Payment and reimbursement services', 3, true)
  RETURNING id INTO dept_accounts_payable;

  INSERT INTO helpdesk_departments (company_id, name, description, sort_order, is_active)
  VALUES (_company_id, 'Finance', 'Financial services and payroll', 4, true)
  RETURNING id INTO dept_finance;

  INSERT INTO helpdesk_departments (company_id, name, description, sort_order, is_active)
  VALUES (_company_id, 'Technology Trainings', 'Technology and system training requests', 5, true)
  RETURNING id INTO dept_technology_trainings;

  INSERT INTO helpdesk_departments (company_id, name, description, sort_order, is_active)
  VALUES (_company_id, 'IT Service Desk', 'IT support and technical assistance', 6, true)
  RETURNING id INTO dept_it_service_desk;

  INSERT INTO helpdesk_departments (company_id, name, description, sort_order, is_active)
  VALUES (_company_id, 'HR', 'Human resources services', 7, true)
  RETURNING id INTO dept_hr;

  INSERT INTO helpdesk_departments (company_id, name, description, sort_order, is_active)
  VALUES (_company_id, 'Marketing', 'Marketing services and requests', 8, true)
  RETURNING id INTO dept_marketing;

  -- Insert sub-departments for Facility Services
  INSERT INTO helpdesk_sub_departments (department_id, name, sort_order, is_active) VALUES
    (dept_facility_services, 'General maintenance', 1, true),
    (dept_facility_services, 'Airconditioning', 2, true),
    (dept_facility_services, 'Lighting', 3, true),
    (dept_facility_services, 'Cleaning', 4, true),
    (dept_facility_services, 'Merchandise', 5, true),
    (dept_facility_services, 'Other', 6, true);

  -- Insert sub-departments for Office Services
  INSERT INTO helpdesk_sub_departments (department_id, name, sort_order, is_active) VALUES
    (dept_office_services, 'Print and Post', 1, true),
    (dept_office_services, 'Couriers and Deliveries', 2, true),
    (dept_office_services, 'Stationary Requests', 3, true),
    (dept_office_services, 'Marketing and Print material request', 4, true);

  -- Insert sub-departments for Accounts Payable
  INSERT INTO helpdesk_sub_departments (department_id, name, sort_order, is_active) VALUES
    (dept_accounts_payable, 'EFT payment', 1, true),
    (dept_accounts_payable, 'Staff Reimbursement request', 2, true),
    (dept_accounts_payable, 'General Inquiry', 3, true);

  -- Insert sub-departments for Finance
  INSERT INTO helpdesk_sub_departments (department_id, name, sort_order, is_active) VALUES
    (dept_finance, 'Statement request', 1, true),
    (dept_finance, 'Payroll issues', 2, true);

  -- Insert sub-departments for Technology Trainings
  INSERT INTO helpdesk_sub_departments (department_id, name, sort_order, is_active) VALUES
    (dept_technology_trainings, 'Request Kestral training', 1, true),
    (dept_technology_trainings, 'Request PACS training', 2, true),
    (dept_technology_trainings, 'Request Eftpos training', 3, true),
    (dept_technology_trainings, 'Request CT Canon Apps training', 4, true),
    (dept_technology_trainings, 'Request CT Siemens Apps training', 5, true),
    (dept_technology_trainings, 'Request MRI Siemens Apps training', 6, true),
    (dept_technology_trainings, 'Request X-ray Apps Training', 7, true),
    (dept_technology_trainings, 'Request US Canon Apps training', 8, true),
    (dept_technology_trainings, 'Request US Philips Apps training', 9, true),
    (dept_technology_trainings, 'Request US GE Apps training', 10, true),
    (dept_technology_trainings, 'Request Lumicare training', 11, true);

  -- Insert sub-departments for IT Service Desk
  INSERT INTO helpdesk_sub_departments (department_id, name, sort_order, is_active) VALUES
    (dept_it_service_desk, 'Get IT help', 1, true),
    (dept_it_service_desk, 'Access mail Inbox', 2, true),
    (dept_it_service_desk, 'Remote Access - VPN', 3, true),
    (dept_it_service_desk, 'Computer Support', 4, true),
    (dept_it_service_desk, 'License Support', 5, true),
    (dept_it_service_desk, 'Request New software', 6, true),
    (dept_it_service_desk, 'Request New hardware', 7, true),
    (dept_it_service_desk, 'Mobile Device Issues', 8, true),
    (dept_it_service_desk, 'Permission access', 9, true),
    (dept_it_service_desk, 'Reset Password', 10, true),
    (dept_it_service_desk, 'Printing/printer Issue', 11, true),
    (dept_it_service_desk, 'Work from home equipment', 12, true),
    (dept_it_service_desk, 'General Support', 13, true);

  -- Insert sub-departments for HR
  INSERT INTO helpdesk_sub_departments (department_id, name, sort_order, is_active) VALUES
    (dept_hr, 'Incident form submission', 1, true),
    (dept_hr, 'Patient complaint', 2, true),
    (dept_hr, 'Staff complaint', 3, true),
    (dept_hr, 'Report HR compliance', 4, true),
    (dept_hr, 'General support', 5, true);

  -- Insert sub-departments for Marketing
  INSERT INTO helpdesk_sub_departments (department_id, name, sort_order, is_active) VALUES
    (dept_marketing, 'Request MLO to see referrer', 1, true),
    (dept_marketing, 'Referrer complaint', 2, true);

END;
$$;