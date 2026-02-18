
-- Add Chris Germon as the notification recipient for Vision Radiology Accounts Payable requests
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
) VALUES (
  '440b33e2-326e-405d-9e1b-942f22ad2553', -- Vision Radiology
  '8b19aaaa-1b91-4979-935b-e6781d40c556', -- Chris Germon
  'Accounts Payable',
  NULL,
  'department',
  true, -- receive notifications
  true, -- can approve
  true, -- can respond
  true, -- can change status
  true, -- can view
  true  -- is active
)
ON CONFLICT DO NOTHING;
