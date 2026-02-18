-- Create table to track calendar sync for MLO visits
CREATE TABLE public.mlo_calendar_sync (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mlo_visit_id UUID REFERENCES public.mlo_visits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  outlook_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'follow_up', -- 'follow_up' or 'visit'
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_modified TIMESTAMP WITH TIME ZONE,
  sync_status TEXT NOT NULL DEFAULT 'synced', -- 'synced', 'pending', 'error'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mlo_visit_id, event_type)
);

-- Enable RLS
ALTER TABLE public.mlo_calendar_sync ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can manage their own calendar sync records
CREATE POLICY "Users can view their own calendar sync records"
ON public.mlo_calendar_sync FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendar sync records"
ON public.mlo_calendar_sync FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar sync records"
ON public.mlo_calendar_sync FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar sync records"
ON public.mlo_calendar_sync FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all calendar sync records
CREATE POLICY "Admins can view all calendar sync records"
ON public.mlo_calendar_sync FOR SELECT
USING (public.is_admin_or_manager());

-- Add index for performance
CREATE INDEX idx_mlo_calendar_sync_user_id ON public.mlo_calendar_sync(user_id);
CREATE INDEX idx_mlo_calendar_sync_outlook_event_id ON public.mlo_calendar_sync(outlook_event_id);

-- Add trigger for updated_at
CREATE TRIGGER update_mlo_calendar_sync_updated_at
  BEFORE UPDATE ON public.mlo_calendar_sync
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();