-- Create system_banners table for banner notifications
CREATE TABLE public.system_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  target_roles TEXT[] DEFAULT '{}',
  target_departments UUID[] DEFAULT '{}',
  show_on_pages TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for active banners lookup
CREATE INDEX idx_system_banners_active ON public.system_banners(company_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.system_banners ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_banners
CREATE POLICY "Users can view active banners for their company"
  ON public.system_banners
  FOR SELECT
  USING (
    company_id = get_user_company(auth.uid())
    AND is_active = true
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date IS NULL OR end_date >= now())
  );

CREATE POLICY "Admins can manage company banners"
  ON public.system_banners
  FOR ALL
  USING (
    (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role))
    OR has_global_role(auth.uid(), 'super_admin'::user_role)
  );

-- Create helpdesk_ticket_checklists table
CREATE TABLE public.helpdesk_ticket_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for ticket lookup
CREATE INDEX idx_ticket_checklists_ticket ON public.helpdesk_ticket_checklists(ticket_id);

-- Enable RLS
ALTER TABLE public.helpdesk_ticket_checklists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checklists
CREATE POLICY "Users can view checklists for tickets they can access"
  ON public.helpdesk_ticket_checklists
  FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM public.helpdesk_tickets
      WHERE created_by = auth.uid() 
        OR assigned_to = auth.uid()
        OR company_id = get_user_company(auth.uid())
    )
  );

CREATE POLICY "Staff can manage checklists"
  ON public.helpdesk_ticket_checklists
  FOR ALL
  USING (
    ticket_id IN (
      SELECT id FROM public.helpdesk_tickets ht
      WHERE has_role(auth.uid(), ht.company_id, 'manager'::user_role)
        OR has_role(auth.uid(), ht.company_id, 'tenant_admin'::user_role)
        OR has_global_role(auth.uid(), 'super_admin'::user_role)
        OR ht.assigned_to = auth.uid()
    )
  );

-- Create helpdesk_status_workflows table
CREATE TABLE public.helpdesk_status_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  department_id UUID REFERENCES public.helpdesk_departments(id),
  trigger_conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]',
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for workflow lookup
CREATE INDEX idx_status_workflows_company ON public.helpdesk_status_workflows(company_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.helpdesk_status_workflows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for status workflows
CREATE POLICY "Users can view company workflows"
  ON public.helpdesk_status_workflows
  FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage workflows"
  ON public.helpdesk_status_workflows
  FOR ALL
  USING (
    (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role))
    OR has_global_role(auth.uid(), 'super_admin'::user_role)
  );

-- Create approval_workflows table
CREATE TABLE public.approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('hardware_request', 'marketing_request', 'user_account', 'custom')),
  steps JSONB NOT NULL DEFAULT '[]',
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for workflow lookup
CREATE INDEX idx_approval_workflows_company_type ON public.approval_workflows(company_id, workflow_type, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view company workflows"
  ON public.approval_workflows
  FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage workflows"
  ON public.approval_workflows
  FOR ALL
  USING (
    (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role))
    OR has_global_role(auth.uid(), 'super_admin'::user_role)
  );

-- Create approval_workflow_instances table
CREATE TABLE public.approval_workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.approval_workflows(id) ON DELETE CASCADE,
  reference_type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for instance lookup
CREATE INDEX idx_workflow_instances_reference ON public.approval_workflow_instances(reference_type, reference_id);
CREATE INDEX idx_workflow_instances_workflow ON public.approval_workflow_instances(workflow_id);

-- Enable RLS
ALTER TABLE public.approval_workflow_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view instances for their requests"
  ON public.approval_workflow_instances
  FOR SELECT
  USING (
    reference_id IN (
      SELECT id FROM public.hardware_requests WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.marketing_requests WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.user_account_requests WHERE requested_by = auth.uid()
    )
    OR workflow_id IN (
      SELECT id FROM public.approval_workflows WHERE company_id = get_user_company(auth.uid())
    )
  );

CREATE POLICY "System can manage instances"
  ON public.approval_workflow_instances
  FOR ALL
  USING (true);

-- Create approval_steps table
CREATE TABLE public.approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL REFERENCES public.approval_workflow_instances(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  approver_role TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
  notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for step lookup
CREATE INDEX idx_approval_steps_instance ON public.approval_steps(workflow_instance_id, step_number);
CREATE INDEX idx_approval_steps_approver ON public.approval_steps(approver_id, status) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.approval_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view steps for their instances"
  ON public.approval_steps
  FOR SELECT
  USING (
    workflow_instance_id IN (
      SELECT id FROM public.approval_workflow_instances
    )
  );

CREATE POLICY "Approvers can update their steps"
  ON public.approval_steps
  FOR UPDATE
  USING (approver_id = auth.uid() AND status = 'pending');

CREATE POLICY "System can manage steps"
  ON public.approval_steps
  FOR ALL
  USING (true);

-- Add fields to profiles for enhanced directory
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS mobile TEXT,
ADD COLUMN IF NOT EXISTS office_location TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS is_visible_in_directory BOOLEAN DEFAULT true;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_system_banners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_system_banners_updated_at
  BEFORE UPDATE ON public.system_banners
  FOR EACH ROW
  EXECUTE FUNCTION update_system_banners_updated_at();

CREATE TRIGGER update_ticket_checklists_updated_at
  BEFORE UPDATE ON public.helpdesk_ticket_checklists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_status_workflows_updated_at
  BEFORE UPDATE ON public.helpdesk_status_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_workflows_updated_at
  BEFORE UPDATE ON public.approval_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_instances_updated_at
  BEFORE UPDATE ON public.approval_workflow_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_steps_updated_at
  BEFORE UPDATE ON public.approval_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();