-- Create system status table
CREATE TABLE public.system_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('operational', 'degraded', 'outage')),
  message text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Add index for active systems
CREATE INDEX idx_system_statuses_active ON public.system_statuses(is_active, sort_order);

-- Enable RLS
ALTER TABLE public.system_statuses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view active system statuses"
  ON public.system_statuses
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Super admins can manage system statuses"
  ON public.system_statuses
  FOR ALL
  USING (has_global_role(auth.uid(), 'super_admin'::user_role))
  WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Add updated_at trigger
CREATE TRIGGER update_system_statuses_updated_at
  BEFORE UPDATE ON public.system_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add audit trigger
CREATE TRIGGER audit_system_statuses
  AFTER INSERT OR UPDATE OR DELETE ON public.system_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_trail();