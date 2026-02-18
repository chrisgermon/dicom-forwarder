-- Create table to store recent campaign report recipient emails
CREATE TABLE IF NOT EXISTS public.campaign_report_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, email)
);

-- Enable RLS
ALTER TABLE public.campaign_report_recipients ENABLE ROW LEVEL SECURITY;

-- Users can only see their own recent emails
CREATE POLICY "Users can view their own recent emails"
  ON public.campaign_report_recipients
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own recent emails
CREATE POLICY "Users can insert their own recent emails"
  ON public.campaign_report_recipients
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own recent emails
CREATE POLICY "Users can update their own recent emails"
  ON public.campaign_report_recipients
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_campaign_report_recipients_user_id ON public.campaign_report_recipients(user_id, last_used_at DESC);