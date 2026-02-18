-- Create enum for license types
CREATE TYPE office365_license AS ENUM (
  'microsoft_365_business_basic',
  'microsoft_365_business_standard',
  'microsoft_365_business_premium',
  'microsoft_365_e3',
  'microsoft_365_e5',
  'office_365_e1',
  'office_365_e3',
  'office_365_e5'
);

-- Create applications table for organizations
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user account requests table
CREATE TABLE public.user_account_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  
  -- User details
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT,
  job_title TEXT,
  manager_name TEXT,
  start_date DATE,
  
  -- Access details
  shared_mailboxes TEXT[], -- Array of mailbox names
  roles TEXT[], -- Array of role names
  office365_license office365_license,
  
  -- Business justification
  business_justification TEXT NOT NULL,
  
  -- Optional hardware request
  hardware_request_id UUID REFERENCES public.hardware_requests(id),
  
  -- Status and approval
  status request_status NOT NULL DEFAULT 'submitted',
  admin_id UUID,
  admin_approved_at TIMESTAMPTZ,
  admin_approval_notes TEXT,
  declined_by UUID,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create junction table for user account applications
CREATE TABLE public.user_account_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_account_request_id UUID NOT NULL REFERENCES public.user_account_requests(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_account_request_id, application_id)
);

-- Enable RLS on all tables
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_account_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_account_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for applications
CREATE POLICY "Company users can view their applications"
  ON public.applications FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Super admins can manage all applications"
  ON public.applications FOR ALL
  USING (has_global_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Tenant admins can manage company applications"
  ON public.applications FOR ALL
  USING (has_role(auth.uid(), company_id, 'tenant_admin'::user_role));

-- RLS Policies for user_account_requests
CREATE POLICY "Users can create their own account requests"
  ON public.user_account_requests FOR INSERT
  WITH CHECK (requested_by = auth.uid() AND company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can view their own account requests"
  ON public.user_account_requests FOR SELECT
  USING (requested_by = auth.uid());

CREATE POLICY "Admins can view all account requests"
  ON public.user_account_requests FOR SELECT
  USING (
    has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
    has_global_role(auth.uid(), 'super_admin'::user_role)
  );

CREATE POLICY "Admins can update account requests"
  ON public.user_account_requests FOR UPDATE
  USING (
    has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
    has_global_role(auth.uid(), 'super_admin'::user_role)
  );

-- RLS Policies for user_account_applications
CREATE POLICY "Users can manage applications for their requests"
  ON public.user_account_applications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_account_requests
      WHERE id = user_account_request_id
      AND requested_by = auth.uid()
    )
  );

CREATE POLICY "Admins can view all account applications"
  ON public.user_account_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_account_requests uar
      WHERE uar.id = user_account_request_id
      AND (
        has_role(auth.uid(), uar.company_id, 'tenant_admin'::user_role) OR
        has_global_role(auth.uid(), 'super_admin'::user_role)
      )
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_account_requests_updated_at
  BEFORE UPDATE ON public.user_account_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();