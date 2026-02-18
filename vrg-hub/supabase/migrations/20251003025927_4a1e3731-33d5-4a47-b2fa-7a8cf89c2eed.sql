-- Create enum types for newsletter system
CREATE TYPE newsletter_cycle_status AS ENUM (
  'open',
  'due_soon',
  'past_due',
  'compiling',
  'locked',
  'published'
);

CREATE TYPE newsletter_submission_status AS ENUM (
  'draft',
  'submitted',
  'approved'
);

CREATE TYPE newsletter_reminder_type AS ENUM (
  'opening',
  'day_10',
  'day_7',
  'day_3',
  'day_1',
  'past_due',
  'escalation'
);

-- Newsletter Cycles table
CREATE TABLE public.newsletter_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month TEXT NOT NULL,
  status newsletter_cycle_status NOT NULL DEFAULT 'open',
  open_at TIMESTAMP WITH TIME ZONE NOT NULL,
  due_at TIMESTAMP WITH TIME ZONE NOT NULL,
  compile_window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  compile_window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  locked_at TIMESTAMP WITH TIME ZONE,
  locked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(month)
);

-- Department Templates table
CREATE TABLE public.department_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department TEXT NOT NULL,
  fields JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(department, version)
);

-- Department Assignments table
CREATE TABLE public.department_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department TEXT NOT NULL,
  assignee_ids UUID[] NOT NULL DEFAULT '{}',
  allow_multiple_clinics BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(department)
);

-- Newsletter Submissions table
CREATE TABLE public.newsletter_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.newsletter_cycles(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  submitter_id UUID NOT NULL REFERENCES auth.users(id),
  submitter_name TEXT NOT NULL,
  clinics TEXT[] DEFAULT '{}',
  payload JSONB NOT NULL DEFAULT '{}',
  has_no_update BOOLEAN NOT NULL DEFAULT false,
  status newsletter_submission_status NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMP WITH TIME ZONE,
  last_edited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cycle_id, department, submitter_id)
);

-- Newsletter Attachments table
CREATE TABLE public.newsletter_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.newsletter_submissions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Newsletter Reminder Logs table
CREATE TABLE public.newsletter_reminder_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.newsletter_cycles(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  channel TEXT NOT NULL DEFAULT 'email',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  type newsletter_reminder_type NOT NULL,
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.newsletter_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_reminder_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view newsletter cycles"
  ON public.newsletter_cycles FOR SELECT USING (true);

CREATE POLICY "Managers can manage cycles"
  ON public.newsletter_cycles FOR ALL
  USING (
    has_role(auth.uid(), get_user_company(auth.uid()), 'manager'::user_role) OR
    has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin'::user_role) OR
    has_global_role(auth.uid(), 'super_admin'::user_role)
  );

CREATE POLICY "Users can view templates"
  ON public.department_templates FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage templates"
  ON public.department_templates FOR ALL
  USING (
    has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin'::user_role) OR
    has_global_role(auth.uid(), 'super_admin'::user_role)
  );

CREATE POLICY "Users can view assignments"
  ON public.department_assignments FOR SELECT USING (true);

CREATE POLICY "Admins can manage assignments"
  ON public.department_assignments FOR ALL
  USING (
    has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin'::user_role) OR
    has_global_role(auth.uid(), 'super_admin'::user_role)
  );

CREATE POLICY "Users can view their submissions"
  ON public.newsletter_submissions FOR SELECT
  USING (submitter_id = auth.uid());

CREATE POLICY "Assigned users can create submissions"
  ON public.newsletter_submissions FOR INSERT
  WITH CHECK (
    submitter_id = auth.uid() AND
    auth.uid() = ANY(
      SELECT unnest(assignee_ids) 
      FROM public.department_assignments 
      WHERE department = newsletter_submissions.department
    )
  );

CREATE POLICY "Users can update their own draft submissions"
  ON public.newsletter_submissions FOR UPDATE
  USING (
    submitter_id = auth.uid() AND
    status IN ('draft', 'submitted') AND
    NOT EXISTS (
      SELECT 1 FROM public.newsletter_cycles 
      WHERE id = cycle_id AND status = 'locked'
    )
  );

CREATE POLICY "Managers can view all submissions"
  ON public.newsletter_submissions FOR SELECT
  USING (
    has_role(auth.uid(), get_user_company(auth.uid()), 'manager'::user_role) OR
    has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin'::user_role) OR
    has_global_role(auth.uid(), 'super_admin'::user_role)
  );

CREATE POLICY "Managers can approve submissions"
  ON public.newsletter_submissions FOR UPDATE
  USING (
    has_role(auth.uid(), get_user_company(auth.uid()), 'manager'::user_role) OR
    has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin'::user_role) OR
    has_global_role(auth.uid(), 'super_admin'::user_role)
  );

CREATE POLICY "Users can manage attachments in their submissions"
  ON public.newsletter_attachments FOR ALL
  USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.newsletter_submissions ns
      WHERE ns.id = submission_id AND ns.submitter_id = auth.uid()
    )
  );

CREATE POLICY "Managers can view all attachments"
  ON public.newsletter_attachments FOR SELECT
  USING (
    has_role(auth.uid(), get_user_company(auth.uid()), 'manager'::user_role) OR
    has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin'::user_role) OR
    has_global_role(auth.uid(), 'super_admin'::user_role)
  );

CREATE POLICY "Users can view their reminder logs"
  ON public.newsletter_reminder_logs FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can view all reminder logs"
  ON public.newsletter_reminder_logs FOR SELECT
  USING (
    has_role(auth.uid(), get_user_company(auth.uid()), 'manager'::user_role) OR
    has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin'::user_role) OR
    has_global_role(auth.uid(), 'super_admin'::user_role)
  );

CREATE POLICY "System can insert reminder logs"
  ON public.newsletter_reminder_logs FOR INSERT WITH CHECK (true);

-- Triggers
CREATE TRIGGER update_newsletter_cycles_updated_at
  BEFORE UPDATE ON public.newsletter_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_department_templates_updated_at
  BEFORE UPDATE ON public.department_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_department_assignments_updated_at
  BEFORE UPDATE ON public.department_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();