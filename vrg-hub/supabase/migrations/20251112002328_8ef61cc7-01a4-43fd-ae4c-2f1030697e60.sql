-- Create incidents table for standalone incident reporting
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reporter_name TEXT NOT NULL,
  incident_involves TEXT NOT NULL,
  persons_involved TEXT NOT NULL,
  clinic TEXT NOT NULL,
  modality_area TEXT NOT NULL,
  incident_date DATE NOT NULL,
  incident_time TEXT NOT NULL,
  incident_type TEXT NOT NULL,
  incident_description TEXT NOT NULL,
  further_comments TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  assigned_to UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Users can create incidents
CREATE POLICY "Users can create incidents"
ON incidents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own incidents
CREATE POLICY "Users can view their own incidents"
ON incidents FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Managers and admins can view all incidents
CREATE POLICY "Managers can view all incidents"
ON incidents FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'tenant_admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Managers and admins can update incidents
CREATE POLICY "Managers can update incidents"
ON incidents FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'tenant_admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);