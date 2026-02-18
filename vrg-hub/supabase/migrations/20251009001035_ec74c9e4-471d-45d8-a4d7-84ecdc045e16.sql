-- Create table for advanced notification configurations per request type
CREATE TABLE IF NOT EXISTS public.request_type_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL, -- 'hardware', 'toner', 'marketing', 'user_account', 'accounts_payable', 'facility_services', 'finance', 'hr', 'it_service_desk', 'marketing_service', 'office_services', 'technology_training'
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receive_notifications BOOLEAN DEFAULT true,
  can_approve BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, request_type, user_id)
);

-- Enable RLS
ALTER TABLE public.request_type_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Super admins can manage all notification configs"
  ON public.request_type_notifications
  FOR ALL
  USING (has_global_role(auth.uid(), 'super_admin'::user_role))
  WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Tenant admins can manage their company notification configs"
  ON public.request_type_notifications
  FOR ALL
  USING (
    has_role(auth.uid(), company_id, 'tenant_admin'::user_role)
  )
  WITH CHECK (
    has_role(auth.uid(), company_id, 'tenant_admin'::user_role)
  );

CREATE POLICY "Users can view their company notification configs"
  ON public.request_type_notifications
  FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

-- Add indexes for performance
CREATE INDEX idx_request_type_notifications_company ON public.request_type_notifications(company_id);
CREATE INDEX idx_request_type_notifications_request_type ON public.request_type_notifications(request_type);
CREATE INDEX idx_request_type_notifications_user ON public.request_type_notifications(user_id);

-- Add updated_at trigger
CREATE TRIGGER update_request_type_notifications_updated_at
  BEFORE UPDATE ON public.request_type_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();