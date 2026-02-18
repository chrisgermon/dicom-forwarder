
-- Add Chris Germon as the notification recipient for ALL departments in Vision Radiology
-- Note: Accounts Payable was already added, so we'll add the others

-- Accounts department
INSERT INTO public.department_user_assignments (
  company_id,
  user_id,
  department,
  sub_department,
  request_type,
  receive_notifications,
  can_approve,
  can_respond,
  can_change_status,
  can_view,
  is_active
) VALUES 
  -- Accounts
  (
    '440b33e2-326e-405d-9e1b-942f22ad2553',
    '8b19aaaa-1b91-4979-935b-e6781d40c556',
    'Accounts',
    NULL,
    'department',
    true, true, true, true, true, true
  ),
  -- IT Service Desk
  (
    '440b33e2-326e-405d-9e1b-942f22ad2553',
    '8b19aaaa-1b91-4979-935b-e6781d40c556',
    'it_service_desk',
    NULL,
    'department',
    true, true, true, true, true, true
  ),
  -- Technology Training
  (
    '440b33e2-326e-405d-9e1b-942f22ad2553',
    '8b19aaaa-1b91-4979-935b-e6781d40c556',
    'technology_training',
    NULL,
    'department',
    true, true, true, true, true, true
  )
ON CONFLICT DO NOTHING;
