-- Create print_order_brands table
CREATE TABLE public.print_order_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  form_url TEXT NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(name, company_id)
);

-- Enable RLS
ALTER TABLE public.print_order_brands ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all brands
CREATE POLICY "Super admins can manage all brands"
ON public.print_order_brands
FOR ALL
USING (has_global_role(auth.uid(), 'super_admin'));

-- Tenant admins can manage their company brands
CREATE POLICY "Tenant admins can manage their brands"
ON public.print_order_brands
FOR ALL
USING (
  company_id = get_user_company(auth.uid()) 
  AND has_role(auth.uid(), company_id, 'tenant_admin')
);

-- Users can view active brands for their company
CREATE POLICY "Users can view their company brands"
ON public.print_order_brands
FOR SELECT
USING (
  is_active = true 
  AND company_id = get_user_company(auth.uid())
);

-- Marketing users can view active brands for their company
CREATE POLICY "Marketing users can view their company brands"
ON public.print_order_brands
FOR SELECT
USING (
  is_active = true 
  AND company_id = get_user_company(auth.uid())
  AND has_role(auth.uid(), company_id, 'marketing')
);

-- Add trigger for updated_at
CREATE TRIGGER update_print_order_brands_updated_at
BEFORE UPDATE ON public.print_order_brands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();