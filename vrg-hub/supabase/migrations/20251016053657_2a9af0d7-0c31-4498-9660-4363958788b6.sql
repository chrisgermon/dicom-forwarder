-- Add phone number to profiles for SMS notifications
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS sms_enabled boolean DEFAULT false;

-- Create request_notifications_assignments table for assigning users to request types
CREATE TABLE IF NOT EXISTS public.request_notification_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL, -- 'hardware', 'marketing', 'department_request', 'toner', etc.
  department text, -- For department-specific requests (nullable for global assignments)
  assignee_ids uuid[] NOT NULL DEFAULT '{}',
  notification_level text NOT NULL DEFAULT 'all', -- 'all', 'new_only', 'updates_only'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_type, department)
);

-- Enable RLS
ALTER TABLE public.request_notification_assignments ENABLE ROW LEVEL SECURITY;

-- Admins can manage assignments
CREATE POLICY "Admins can manage notification assignments"
ON public.request_notification_assignments
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'tenant_admin'::app_role)
);

-- Users can view assignments
CREATE POLICY "Users can view notification assignments"
ON public.request_notification_assignments
FOR SELECT
USING (true);

-- Add SMS preferences to notification_settings
ALTER TABLE public.notification_settings
ADD COLUMN IF NOT EXISTS sms_enabled boolean DEFAULT false;

-- Create trigger for updated_at
CREATE TRIGGER update_request_notification_assignments_updated_at
BEFORE UPDATE ON public.request_notification_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();