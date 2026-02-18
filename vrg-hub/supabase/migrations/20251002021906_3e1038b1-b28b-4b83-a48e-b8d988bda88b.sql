-- Create hardware_catalog table for admin-managed items
CREATE TABLE public.hardware_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  model_number TEXT,
  vendor TEXT,
  unit_price NUMERIC,
  currency TEXT DEFAULT 'AUD',
  category TEXT,
  specifications JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.hardware_catalog ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all catalog items
CREATE POLICY "Super admins can manage all catalog items"
ON public.hardware_catalog
FOR ALL
USING (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Tenant admins can manage their company's catalog items
CREATE POLICY "Tenant admins can manage company catalog items"
ON public.hardware_catalog
FOR ALL
USING (has_role(auth.uid(), company_id, 'tenant_admin'::user_role));

-- All authenticated users can view active catalog items from their company
CREATE POLICY "Users can view their company catalog items"
ON public.hardware_catalog
FOR SELECT
USING (
  is_active = true 
  AND company_id = get_user_company(auth.uid())
);

-- Add trigger for updated_at
CREATE TRIGGER update_hardware_catalog_updated_at
BEFORE UPDATE ON public.hardware_catalog
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Make business_justification optional in hardware_requests
ALTER TABLE public.hardware_requests 
ALTER COLUMN business_justification DROP NOT NULL;

-- Add catalog_item_id to request_items to track catalog selections
ALTER TABLE public.request_items
ADD COLUMN catalog_item_id UUID REFERENCES public.hardware_catalog(id);

-- Create index for better performance
CREATE INDEX idx_hardware_catalog_company ON public.hardware_catalog(company_id) WHERE is_active = true;
CREATE INDEX idx_request_items_catalog ON public.request_items(catalog_item_id);