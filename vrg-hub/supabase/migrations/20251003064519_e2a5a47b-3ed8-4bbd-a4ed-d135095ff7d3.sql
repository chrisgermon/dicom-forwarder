-- Create company_features table to manage which features are enabled per company
CREATE TABLE public.company_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, feature_key)
);

-- Enable RLS
ALTER TABLE public.company_features ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all company features
CREATE POLICY "Super admins can manage all company features"
ON public.company_features
FOR ALL
TO authenticated
USING (has_global_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Users can view features for their company
CREATE POLICY "Users can view their company features"
ON public.company_features
FOR SELECT
TO authenticated
USING (company_id = get_user_company(auth.uid()));

-- Tenant admins can view their company features
CREATE POLICY "Tenant admins can view their company features"
ON public.company_features
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  ) AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role)
);

-- Add trigger for updated_at
CREATE TRIGGER update_company_features_updated_at
BEFORE UPDATE ON public.company_features
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default features for existing companies
INSERT INTO public.company_features (company_id, feature_key, enabled)
SELECT 
  id,
  feature_key,
  true
FROM 
  public.companies,
  (VALUES 
    ('hardware_requests'),
    ('toner_requests'),
    ('user_accounts'),
    ('marketing_requests'),
    ('monthly_newsletter'),
    ('modality_management'),
    ('print_ordering')
  ) AS features(feature_key)
ON CONFLICT (company_id, feature_key) DO NOTHING;