-- Create junction table for catalog items and companies
CREATE TABLE IF NOT EXISTS public.catalog_item_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_item_id UUID NOT NULL REFERENCES public.hardware_catalog(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(catalog_item_id, company_id)
);

-- Enable RLS
ALTER TABLE public.catalog_item_companies ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all catalog item companies
CREATE POLICY "Super admins can manage all catalog item companies"
ON public.catalog_item_companies
FOR ALL
USING (has_global_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Tenant admins can manage their catalog item companies
CREATE POLICY "Tenant admins can manage their catalog item companies"
ON public.catalog_item_companies
FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE user_id = auth.uid()
  )
  AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role)
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE user_id = auth.uid()
  )
  AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role)
);

-- Users can view catalog item companies for their company
CREATE POLICY "Users can view catalog item companies for their company"
ON public.catalog_item_companies
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX idx_catalog_item_companies_item ON public.catalog_item_companies(catalog_item_id);
CREATE INDEX idx_catalog_item_companies_company ON public.catalog_item_companies(company_id);