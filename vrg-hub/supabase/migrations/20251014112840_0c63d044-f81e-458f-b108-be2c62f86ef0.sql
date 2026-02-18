-- Create marketing_requests table
CREATE TABLE IF NOT EXISTS public.marketing_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  request_type TEXT NOT NULL,
  description TEXT,
  target_audience TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  attachments JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create hardware_catalog table
CREATE TABLE IF NOT EXISTS public.hardware_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  manufacturer TEXT,
  model_number TEXT,
  price NUMERIC,
  currency TEXT DEFAULT 'USD',
  specifications JSONB,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hardware_catalog ENABLE ROW LEVEL SECURITY;

-- Marketing Requests RLS Policies
CREATE POLICY "Users can view their own marketing requests"
ON public.marketing_requests
FOR SELECT
USING (
  auth.uid() = user_id OR
  has_role(auth.uid(), 'marketing_manager'::app_role) OR
  has_role(auth.uid(), 'tenant_admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Users can create marketing requests"
ON public.marketing_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own draft requests"
ON public.marketing_requests
FOR UPDATE
USING (auth.uid() = user_id AND status = 'draft')
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Marketing managers can manage requests"
ON public.marketing_requests
FOR ALL
USING (
  has_role(auth.uid(), 'marketing_manager'::app_role) OR
  has_role(auth.uid(), 'tenant_admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Hardware Catalog RLS Policies
CREATE POLICY "Everyone can view active catalog items"
ON public.hardware_catalog
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage catalog"
ON public.hardware_catalog
FOR ALL
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Add updated_at triggers
CREATE TRIGGER update_marketing_requests_updated_at
BEFORE UPDATE ON public.marketing_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hardware_catalog_updated_at
BEFORE UPDATE ON public.hardware_catalog
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();