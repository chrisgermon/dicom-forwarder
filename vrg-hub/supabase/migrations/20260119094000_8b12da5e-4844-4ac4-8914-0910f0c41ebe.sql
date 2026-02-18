-- Create a modality types reference table (different from DICOM modalities table)
CREATE TABLE public.modality_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.modality_types ENABLE ROW LEVEL SECURITY;

-- Everyone can view modality types
CREATE POLICY "Anyone can view modality types"
  ON public.modality_types FOR SELECT
  USING (true);

-- Only admins can manage modality types
CREATE POLICY "Admins can manage modality types"
  ON public.modality_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.rbac_user_roles ur
      JOIN public.rbac_roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'tenant_admin')
    )
  );

-- Seed standard radiology modality types
INSERT INTO public.modality_types (key, name, icon, sort_order) VALUES
  ('xray', 'X-Ray', 'Scan', 1),
  ('ct', 'CT', 'Activity', 2),
  ('mri', 'MRI', 'Brain', 3),
  ('ultrasound', 'Ultrasound', 'Heart', 4),
  ('mammography', 'Mammography', 'Microscope', 5),
  ('eos', 'EOS', 'Bone', 6),
  ('dexa', 'DEXA', 'Bone', 7),
  ('opg', 'OPG', 'Scan', 8),
  ('nuclear_medicine', 'Nuclear Medicine', 'Atom', 9);

-- Create MLO modality targets table (per worksite, per modality type)
CREATE TABLE public.mlo_modality_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  modality_type_id UUID NOT NULL REFERENCES public.modality_types(id) ON DELETE CASCADE,
  target_period TEXT NOT NULL CHECK (target_period IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_referrals INTEGER DEFAULT 0,
  target_scans INTEGER DEFAULT 0,
  target_revenue NUMERIC(12, 2),
  set_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, location_id, modality_type_id, target_period, period_start)
);

-- Enable RLS
ALTER TABLE public.mlo_modality_targets ENABLE ROW LEVEL SECURITY;

-- MLOs can view their own modality targets
CREATE POLICY "MLOs can view own modality targets"
  ON public.mlo_modality_targets FOR SELECT
  USING (auth.uid() = user_id);

-- Managers can view all modality targets
CREATE POLICY "Managers can view all modality targets"
  ON public.mlo_modality_targets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rbac_user_roles ur
      JOIN public.rbac_roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'tenant_admin', 'manager', 'marketing_manager')
    )
  );

-- Managers can manage modality targets
CREATE POLICY "Managers can manage modality targets"
  ON public.mlo_modality_targets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.rbac_user_roles ur
      JOIN public.rbac_roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'tenant_admin', 'manager', 'marketing_manager')
    )
  );

-- Add indexes for performance
CREATE INDEX idx_mlo_modality_targets_user ON public.mlo_modality_targets(user_id);
CREATE INDEX idx_mlo_modality_targets_location ON public.mlo_modality_targets(location_id);
CREATE INDEX idx_mlo_modality_targets_modality_type ON public.mlo_modality_targets(modality_type_id);
CREATE INDEX idx_mlo_modality_targets_period ON public.mlo_modality_targets(period_start, period_end);

-- Add updated_at trigger
CREATE TRIGGER update_mlo_modality_targets_updated_at
  BEFORE UPDATE ON public.mlo_modality_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();