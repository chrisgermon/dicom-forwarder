-- MLO CRM Module - Database Schema

-- Create mlo_assignments table - links MLOs to their assigned worksites
CREATE TABLE public.mlo_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, location_id)
);

-- Create mlo_targets table - targets set by commercial manager per MLO/worksite
CREATE TABLE public.mlo_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  target_period TEXT NOT NULL CHECK (target_period IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_visits INTEGER DEFAULT 0,
  target_new_referrers INTEGER DEFAULT 0,
  target_revenue NUMERIC(12, 2),
  set_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create mlo_visits table - record client/referrer visits
CREATE TABLE public.mlo_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  visit_type TEXT NOT NULL CHECK (visit_type IN ('site_visit', 'phone_call', 'video_call', 'email', 'event', 'other')),
  clinic_key INTEGER,
  referrer_key INTEGER,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  contact_name TEXT,
  contact_role TEXT,
  purpose TEXT,
  outcome TEXT CHECK (outcome IN ('positive', 'neutral', 'follow_up_required', 'issue_raised', 'no_contact')),
  notes TEXT,
  follow_up_date DATE,
  follow_up_notes TEXT,
  follow_up_completed BOOLEAN DEFAULT false,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_mlo_assignments_user ON public.mlo_assignments(user_id);
CREATE INDEX idx_mlo_assignments_location ON public.mlo_assignments(location_id);
CREATE INDEX idx_mlo_targets_user ON public.mlo_targets(user_id);
CREATE INDEX idx_mlo_targets_period ON public.mlo_targets(period_start, period_end);
CREATE INDEX idx_mlo_visits_user ON public.mlo_visits(user_id);
CREATE INDEX idx_mlo_visits_date ON public.mlo_visits(visit_date);
CREATE INDEX idx_mlo_visits_follow_up ON public.mlo_visits(follow_up_date) WHERE follow_up_date IS NOT NULL AND follow_up_completed = false;

-- Enable RLS
ALTER TABLE public.mlo_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mlo_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mlo_visits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mlo_assignments

-- Admins/managers can view all assignments
CREATE POLICY "Admins can manage all assignments"
ON public.mlo_assignments
FOR ALL
TO authenticated
USING (public.is_admin_or_manager());

-- MLOs can view their own assignments
CREATE POLICY "Users can view own assignments"
ON public.mlo_assignments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for mlo_targets

-- Admins/managers can manage all targets
CREATE POLICY "Admins can manage all targets"
ON public.mlo_targets
FOR ALL
TO authenticated
USING (public.is_admin_or_manager());

-- MLOs can view their own targets
CREATE POLICY "Users can view own targets"
ON public.mlo_targets
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for mlo_visits

-- Admins/managers can view all visits
CREATE POLICY "Admins can view all visits"
ON public.mlo_visits
FOR SELECT
TO authenticated
USING (public.is_admin_or_manager());

-- MLOs can manage their own visits
CREATE POLICY "Users can manage own visits"
ON public.mlo_visits
FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Create triggers for updated_at
CREATE TRIGGER update_mlo_assignments_updated_at
  BEFORE UPDATE ON public.mlo_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mlo_targets_updated_at
  BEFORE UPDATE ON public.mlo_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mlo_visits_updated_at
  BEFORE UPDATE ON public.mlo_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.mlo_assignments IS 'Links Medical Liaison Officers (MLOs) to their assigned worksites/locations';
COMMENT ON TABLE public.mlo_targets IS 'Targets set by commercial manager for MLO performance tracking';
COMMENT ON TABLE public.mlo_visits IS 'Records of MLO visits to clients/referrers';