-- Create canned responses table for predefined reply templates
CREATE TABLE IF NOT EXISTS public.canned_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;

-- Users can view their company's canned responses
CREATE POLICY "Users can view their company canned responses"
  ON public.canned_responses
  FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

-- Admins and managers can manage canned responses
CREATE POLICY "Admins can manage canned responses"
  ON public.canned_responses
  FOR ALL
  USING (
    has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
    has_role(auth.uid(), company_id, 'manager'::user_role) OR
    has_global_role(auth.uid(), 'super_admin'::user_role)
  );

-- Add index for company_id lookups
CREATE INDEX IF NOT EXISTS idx_canned_responses_company_id ON public.canned_responses(company_id);

-- Add updated_at trigger
CREATE TRIGGER update_canned_responses_updated_at
  BEFORE UPDATE ON public.canned_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();