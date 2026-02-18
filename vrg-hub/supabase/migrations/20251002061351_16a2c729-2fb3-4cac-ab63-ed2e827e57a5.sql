-- Create toner_requests table
CREATE TABLE public.toner_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  printer_model TEXT,
  toner_type TEXT,
  urgency TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'submitted',
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.toner_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own toner requests
CREATE POLICY "Users can create their own toner requests"
ON public.toner_requests
FOR INSERT
WITH CHECK (user_id = auth.uid() AND company_id = get_user_company(auth.uid()));

-- Users can view their own toner requests
CREATE POLICY "Users can view their own toner requests"
ON public.toner_requests
FOR SELECT
USING (user_id = auth.uid());

-- Managers and admins can view all company toner requests
CREATE POLICY "Managers can view company toner requests"
ON public.toner_requests
FOR SELECT
USING (
  has_role(auth.uid(), company_id, 'manager'::user_role) OR 
  has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR 
  has_global_role(auth.uid(), 'super_admin'::user_role)
);

-- Managers and admins can update toner requests
CREATE POLICY "Managers can update toner requests"
ON public.toner_requests
FOR UPDATE
USING (
  has_role(auth.uid(), company_id, 'manager'::user_role) OR 
  has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR 
  has_global_role(auth.uid(), 'super_admin'::user_role)
);

-- Add trigger for updated_at
CREATE TRIGGER update_toner_requests_updated_at
BEFORE UPDATE ON public.toner_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add audit logging trigger
CREATE TRIGGER log_toner_requests_changes
AFTER INSERT OR UPDATE OR DELETE ON public.toner_requests
FOR EACH ROW
EXECUTE FUNCTION public.log_audit_trail();