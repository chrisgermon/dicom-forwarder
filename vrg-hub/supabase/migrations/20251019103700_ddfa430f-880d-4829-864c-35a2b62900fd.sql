-- Add RLS policies for reminder_notifications so users can read their own notifications
ALTER TABLE public.reminder_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view notifications for their own reminders
DROP POLICY IF EXISTS "Users can view their reminder notifications" ON public.reminder_notifications;

CREATE POLICY "Users can view their reminder notifications"
ON public.reminder_notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.reminders
    WHERE reminders.id = reminder_notifications.reminder_id
    AND reminders.user_id = auth.uid()
  )
);

-- System can insert notifications
DROP POLICY IF EXISTS "System can insert notifications" ON public.reminder_notifications;

CREATE POLICY "System can insert notifications"
ON public.reminder_notifications
FOR INSERT
WITH CHECK (true);

-- Users can update their own notifications (for dismissing)
DROP POLICY IF EXISTS "Users can update their notifications" ON public.reminder_notifications;

CREATE POLICY "Users can update their notifications"
ON public.reminder_notifications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.reminders
    WHERE reminders.id = reminder_notifications.reminder_id
    AND reminders.user_id = auth.uid()
  )
);