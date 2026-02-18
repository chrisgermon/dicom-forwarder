-- Create advance notice options table
CREATE TABLE public.reminder_advance_notice_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  days INTEGER NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reminder_advance_notice_options ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read active advance notice options"
  ON public.reminder_advance_notice_options FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage advance notice options"
  ON public.reminder_advance_notice_options FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role));

-- Insert default options
INSERT INTO public.reminder_advance_notice_options (days, label, sort_order) VALUES
  (365, '1 Year', 1),
  (180, '6 Months', 2),
  (90, '90 Days', 3),
  (60, '60 Days', 4),
  (30, '30 Days', 5),
  (14, '14 Days', 6),
  (7, '7 Days', 7),
  (1, '1 Day', 8);