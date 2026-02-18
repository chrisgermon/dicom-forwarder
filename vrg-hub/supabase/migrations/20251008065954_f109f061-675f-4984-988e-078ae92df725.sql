-- Create department requests table
CREATE TABLE public.department_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  department TEXT NOT NULL,
  sub_department TEXT NOT NULL,
  location_id UUID REFERENCES public.company_locations(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'submitted',
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.department_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create their own department requests"
  ON public.department_requests
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can view their own department requests"
  ON public.department_requests
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Managers can view all company department requests"
  ON public.department_requests
  FOR SELECT
  USING (
    has_role(auth.uid(), company_id, 'manager'::user_role) OR
    has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
    has_global_role(auth.uid(), 'super_admin'::user_role)
  );

CREATE POLICY "Managers can update department requests"
  ON public.department_requests
  FOR UPDATE
  USING (
    has_role(auth.uid(), company_id, 'manager'::user_role) OR
    has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
    has_global_role(auth.uid(), 'super_admin'::user_role)
  );

-- Create index for better query performance
CREATE INDEX idx_department_requests_company ON public.department_requests(company_id);
CREATE INDEX idx_department_requests_user ON public.department_requests(user_id);
CREATE INDEX idx_department_requests_department ON public.department_requests(department);

-- Trigger for updated_at
CREATE TRIGGER update_department_requests_updated_at
  BEFORE UPDATE ON public.department_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();