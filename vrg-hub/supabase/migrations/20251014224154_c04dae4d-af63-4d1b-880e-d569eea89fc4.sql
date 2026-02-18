-- Create reminders table
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  reminder_type TEXT NOT NULL, -- 'license_expiration', 'event', 'general', 'certification', 'contract', 'subscription'
  reminder_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- 'daily', 'weekly', 'monthly', 'yearly'
  recurrence_interval INTEGER DEFAULT 1,
  notification_channels JSONB NOT NULL DEFAULT '{"email": true, "sms": false, "in_app": true}'::jsonb,
  advance_notice_days INTEGER[] DEFAULT ARRAY[7, 3, 1], -- send reminders X days before
  metadata JSONB, -- license number, event location, etc.
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled', 'expired'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  phone_number TEXT, -- for SMS notifications
  email TEXT -- override default email
);

-- Create reminder notifications log table
CREATE TABLE public.reminder_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reminder_id UUID NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'email', 'sms', 'in_app'
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'pending'
  error_message TEXT,
  days_before INTEGER, -- how many days before the reminder date this was sent
  recipient TEXT, -- email or phone number
  metadata JSONB
);

-- Create reminder categories table
CREATE TABLE public.reminder_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default categories
INSERT INTO public.reminder_categories (name, description, icon, color, sort_order) VALUES
  ('License Expiration', 'Professional licenses and certifications', 'FileCheck', 'hsl(var(--primary))', 1),
  ('Event', 'Meetings, conferences, and appointments', 'Calendar', 'hsl(var(--chart-2))', 2),
  ('Certification', 'Training certifications and renewals', 'Award', 'hsl(var(--chart-3))', 3),
  ('Contract', 'Contract renewals and expirations', 'FileText', 'hsl(var(--chart-4))', 4),
  ('Subscription', 'Service and subscription renewals', 'CreditCard', 'hsl(var(--chart-5))', 5),
  ('General', 'General reminders', 'Bell', 'hsl(var(--muted-foreground))', 6);

-- Enable RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reminders
CREATE POLICY "Users can view their own reminders"
  ON public.reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reminders"
  ON public.reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders"
  ON public.reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders"
  ON public.reminders FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all reminders
CREATE POLICY "Admins can view all reminders"
  ON public.reminders FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role));

-- RLS Policies for reminder notifications
CREATE POLICY "Users can view their own reminder notifications"
  ON public.reminder_notifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.reminders
    WHERE reminders.id = reminder_notifications.reminder_id
    AND reminders.user_id = auth.uid()
  ));

CREATE POLICY "System can insert notifications"
  ON public.reminder_notifications FOR INSERT
  WITH CHECK (true);

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
  ON public.reminder_notifications FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role));

-- RLS Policies for categories
CREATE POLICY "Anyone can view active categories"
  ON public.reminder_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage categories"
  ON public.reminder_categories FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role));

-- Create indexes
CREATE INDEX idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX idx_reminders_reminder_date ON public.reminders(reminder_date);
CREATE INDEX idx_reminders_status ON public.reminders(status);
CREATE INDEX idx_reminders_is_active ON public.reminders(is_active);
CREATE INDEX idx_reminder_notifications_reminder_id ON public.reminder_notifications(reminder_id);
CREATE INDEX idx_reminder_notifications_sent_at ON public.reminder_notifications(sent_at);

-- Create trigger for updated_at
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();