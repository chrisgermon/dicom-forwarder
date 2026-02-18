-- Create events table for upcoming events on home page
CREATE TABLE public.upcoming_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.upcoming_events ENABLE ROW LEVEL SECURITY;

-- Everyone can view events
CREATE POLICY "Everyone can view events" 
ON public.upcoming_events 
FOR SELECT 
USING (true);

-- Admins can manage events
CREATE POLICY "Admins can insert events" 
ON public.upcoming_events 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('tenant_admin', 'super_admin')
  )
);

CREATE POLICY "Admins can update events" 
ON public.upcoming_events 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('tenant_admin', 'super_admin')
  )
);

CREATE POLICY "Admins can delete events" 
ON public.upcoming_events 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('tenant_admin', 'super_admin')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_upcoming_events_updated_at
BEFORE UPDATE ON public.upcoming_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();