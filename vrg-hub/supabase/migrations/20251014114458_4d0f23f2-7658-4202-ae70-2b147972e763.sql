-- Create newsletter cycles table
CREATE TABLE public.newsletter_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_month_year UNIQUE(month, year)
);

-- Create newsletter assignments table
CREATE TABLE public.newsletter_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.newsletter_cycles(id) ON DELETE CASCADE,
  contributor_id UUID NOT NULL,
  department TEXT NOT NULL,
  topic TEXT,
  word_count INTEGER DEFAULT 200,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create newsletter submissions table
CREATE TABLE public.newsletter_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.newsletter_assignments(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.newsletter_cycles(id) ON DELETE CASCADE,
  contributor_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  department TEXT NOT NULL,
  images JSONB,
  attachments JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create newsletter templates table
CREATE TABLE public.newsletter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  subject_template TEXT,
  body_template TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.newsletter_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for newsletter_cycles
CREATE POLICY "Everyone can view newsletter cycles"
  ON public.newsletter_cycles FOR SELECT
  USING (true);

CREATE POLICY "Managers can manage newsletter cycles"
  ON public.newsletter_cycles FOR ALL
  USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'super_admin'));

-- RLS Policies for newsletter_assignments
CREATE POLICY "Users can view their own assignments"
  ON public.newsletter_assignments FOR SELECT
  USING (auth.uid() = contributor_id OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Managers can manage all assignments"
  ON public.newsletter_assignments FOR ALL
  USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'super_admin'));

-- RLS Policies for newsletter_submissions
CREATE POLICY "Users can view their own submissions"
  ON public.newsletter_submissions FOR SELECT
  USING (auth.uid() = contributor_id OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Contributors can create submissions"
  ON public.newsletter_submissions FOR INSERT
  WITH CHECK (auth.uid() = contributor_id);

CREATE POLICY "Contributors can update their draft submissions"
  ON public.newsletter_submissions FOR UPDATE
  USING (auth.uid() = contributor_id AND status = 'draft');

CREATE POLICY "Managers can manage all submissions"
  ON public.newsletter_submissions FOR ALL
  USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'super_admin'));

-- RLS Policies for newsletter_templates
CREATE POLICY "Everyone can view active templates"
  ON public.newsletter_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Managers can manage templates"
  ON public.newsletter_templates FOR ALL
  USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'super_admin'));

-- Create triggers for updated_at
CREATE TRIGGER update_newsletter_cycles_updated_at
  BEFORE UPDATE ON public.newsletter_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_newsletter_assignments_updated_at
  BEFORE UPDATE ON public.newsletter_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_newsletter_submissions_updated_at
  BEFORE UPDATE ON public.newsletter_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_newsletter_templates_updated_at
  BEFORE UPDATE ON public.newsletter_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_newsletter_assignments_cycle ON public.newsletter_assignments(cycle_id);
CREATE INDEX idx_newsletter_assignments_contributor ON public.newsletter_assignments(contributor_id);
CREATE INDEX idx_newsletter_submissions_cycle ON public.newsletter_submissions(cycle_id);
CREATE INDEX idx_newsletter_submissions_assignment ON public.newsletter_submissions(assignment_id);
CREATE INDEX idx_newsletter_submissions_contributor ON public.newsletter_submissions(contributor_id);
CREATE INDEX idx_newsletter_cycles_status ON public.newsletter_cycles(status);
CREATE INDEX idx_newsletter_cycles_year_month ON public.newsletter_cycles(year, month);