-- Create notification type enum
CREATE TYPE notification_type AS ENUM (
  'news_article',
  'newsletter_submission',
  'request_approved',
  'request_declined',
  'company_announcement',
  'user_mention'
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_company_wide BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view notifications for their company (company-wide or personal)
CREATE POLICY "Users can view their notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company(auth.uid()) AND
  (is_company_wide = true OR user_id = auth.uid())
);

-- Users can mark their notifications as read
CREATE POLICY "Users can update their notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR 
  (is_company_wide = true AND company_id = get_user_company(auth.uid()))
)
WITH CHECK (
  user_id = auth.uid() OR 
  (is_company_wide = true AND company_id = get_user_company(auth.uid()))
);

-- Managers can create notifications
CREATE POLICY "Managers can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), company_id, 'manager'::user_role) OR
  has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
  has_global_role(auth.uid(), 'super_admin'::user_role)
);

-- Create index for performance
CREATE INDEX idx_notifications_user_company ON public.notifications(user_id, company_id, is_read);
CREATE INDEX idx_notifications_company_wide ON public.notifications(company_id, is_company_wide) WHERE is_company_wide = true;