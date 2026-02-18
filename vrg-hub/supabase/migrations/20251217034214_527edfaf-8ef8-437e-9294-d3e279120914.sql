-- Create newsletter_reminder_logs table to track all reminder history
CREATE TABLE public.newsletter_reminder_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.newsletter_cycles(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  user_id UUID,
  channel TEXT NOT NULL DEFAULT 'email',
  type TEXT NOT NULL,
  metadata JSONB,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.newsletter_reminder_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view reminder logs"
ON public.newsletter_reminder_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'tenant_admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

-- System can insert logs (for edge functions)
CREATE POLICY "System can insert reminder logs"
ON public.newsletter_reminder_logs
FOR INSERT
WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX idx_newsletter_reminder_logs_cycle_id ON public.newsletter_reminder_logs(cycle_id);
CREATE INDEX idx_newsletter_reminder_logs_sent_at ON public.newsletter_reminder_logs(sent_at DESC);