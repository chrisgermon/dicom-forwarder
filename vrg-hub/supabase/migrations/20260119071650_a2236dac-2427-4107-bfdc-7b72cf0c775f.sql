-- Create table to store imported Outlook calendar events
CREATE TABLE public.mlo_outlook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  outlook_event_id TEXT NOT NULL,
  subject TEXT,
  start_datetime TIMESTAMPTZ,
  end_datetime TIMESTAMPTZ,
  location TEXT,
  body_preview TEXT,
  web_link TEXT,
  last_modified TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, outlook_event_id)
);

-- Enable RLS
ALTER TABLE public.mlo_outlook_events ENABLE ROW LEVEL SECURITY;

-- Users can only see their own imported events
CREATE POLICY "Users can view their own outlook events"
  ON public.mlo_outlook_events FOR SELECT
  USING (auth.uid() = user_id);

-- Users can manage their own imported events
CREATE POLICY "Users can manage their own outlook events"
  ON public.mlo_outlook_events FOR ALL
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_mlo_outlook_events_user_id ON public.mlo_outlook_events(user_id);
CREATE INDEX idx_mlo_outlook_events_outlook_id ON public.mlo_outlook_events(outlook_event_id);
CREATE INDEX idx_mlo_outlook_events_start ON public.mlo_outlook_events(start_datetime);