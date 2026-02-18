-- Add audit table to track target changes for full history
CREATE TABLE public.mlo_modality_target_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_id UUID NOT NULL,
  user_id UUID NOT NULL,
  location_id UUID NOT NULL,
  modality_type_id UUID NOT NULL,
  target_period TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_referrals INTEGER NOT NULL DEFAULT 0,
  target_scans INTEGER NOT NULL DEFAULT 0,
  target_revenue NUMERIC(12,2),
  action TEXT NOT NULL, -- 'created', 'updated', 'superseded', 'deleted'
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  old_values JSONB,
  new_values JSONB,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.mlo_modality_target_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Users with proper roles can view audit logs (using user_roles table)
CREATE POLICY "Managers can view target audit logs"
ON public.mlo_modality_target_audit
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'marketing_manager')
  )
);

-- Policy: Authenticated users can create audit logs
CREATE POLICY "Authenticated users can create audit logs"
ON public.mlo_modality_target_audit
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for faster queries
CREATE INDEX idx_target_audit_target_id ON public.mlo_modality_target_audit(target_id);
CREATE INDEX idx_target_audit_user_id ON public.mlo_modality_target_audit(user_id);
CREATE INDEX idx_target_audit_changed_at ON public.mlo_modality_target_audit(changed_at DESC);

-- Add versioning columns to the main targets table
ALTER TABLE public.mlo_modality_targets 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES public.mlo_modality_targets(id),
ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMP WITH TIME ZONE;