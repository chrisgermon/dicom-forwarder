-- Create user offboarding requests table
CREATE TABLE IF NOT EXISTS public.user_offboarding_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  department TEXT,
  last_working_day DATE NOT NULL,
  manager_name TEXT,
  return_laptop BOOLEAN DEFAULT false,
  return_phone BOOLEAN DEFAULT false,
  return_other TEXT,
  disable_accounts BOOLEAN DEFAULT true,
  revoke_applications TEXT[],
  remove_shared_mailboxes TEXT[],
  forward_email_to TEXT,
  exit_interview_completed BOOLEAN DEFAULT false,
  additional_notes TEXT,
  status request_status NOT NULL DEFAULT 'submitted',
  admin_id UUID,
  admin_approved_at TIMESTAMP WITH TIME ZONE,
  admin_approval_notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_offboarding_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own offboarding requests
CREATE POLICY "Users can create offboarding requests"
ON public.user_offboarding_requests
FOR INSERT
TO authenticated
WITH CHECK (
  requested_by = auth.uid() AND 
  company_id = get_user_company(auth.uid())
);

-- Users can view their own offboarding requests
CREATE POLICY "Users can view their offboarding requests"
ON public.user_offboarding_requests
FOR SELECT
TO authenticated
USING (requested_by = auth.uid());

-- Admins can view all offboarding requests for their company
CREATE POLICY "Admins can view company offboarding requests"
ON public.user_offboarding_requests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
  has_global_role(auth.uid(), 'super_admin'::user_role)
);

-- Admins can update offboarding requests
CREATE POLICY "Admins can update offboarding requests"
ON public.user_offboarding_requests
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
  has_global_role(auth.uid(), 'super_admin'::user_role)
);

-- Create trigger for updated_at
CREATE TRIGGER update_user_offboarding_requests_updated_at
BEFORE UPDATE ON public.user_offboarding_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();