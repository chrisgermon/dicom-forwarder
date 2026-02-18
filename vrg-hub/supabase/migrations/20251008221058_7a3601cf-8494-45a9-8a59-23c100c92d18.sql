-- Create company request prefixes table
CREATE TABLE IF NOT EXISTS public.company_request_prefixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  prefix TEXT NOT NULL CHECK (length(prefix) = 3 AND prefix = upper(prefix)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id),
  UNIQUE(prefix)
);

-- Add request_number to all request tables
ALTER TABLE public.hardware_requests 
  ADD COLUMN IF NOT EXISTS request_number TEXT UNIQUE;

ALTER TABLE public.marketing_requests 
  ADD COLUMN IF NOT EXISTS request_number TEXT UNIQUE;

ALTER TABLE public.user_account_requests 
  ADD COLUMN IF NOT EXISTS request_number TEXT UNIQUE;

ALTER TABLE public.department_requests 
  ADD COLUMN IF NOT EXISTS request_number TEXT UNIQUE;

ALTER TABLE public.toner_requests 
  ADD COLUMN IF NOT EXISTS request_number TEXT UNIQUE;

-- Create table for tracking request counters per company
CREATE TABLE IF NOT EXISTS public.company_request_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Create enhanced department user assignments table (replacing the single assigned_to field approach)
CREATE TABLE IF NOT EXISTS public.department_user_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  sub_department TEXT,
  request_type TEXT, -- 'hardware', 'marketing', 'user_account', 'department', 'toner', etc.
  user_id UUID NOT NULL,
  can_view BOOLEAN DEFAULT true,
  can_respond BOOLEAN DEFAULT true,
  can_approve BOOLEAN DEFAULT false,
  can_change_status BOOLEAN DEFAULT true,
  receive_notifications BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, department, sub_department, request_type, user_id)
);

-- Insert Vision Radiology prefix
INSERT INTO public.company_request_prefixes (company_id, prefix)
SELECT id, 'VRG'
FROM public.companies
WHERE name = 'Vision Radiology'
ON CONFLICT (company_id) DO NOTHING;

-- Initialize counter for Vision Radiology
INSERT INTO public.company_request_counters (company_id, counter)
SELECT id, 0
FROM public.companies
WHERE name = 'Vision Radiology'
ON CONFLICT (company_id) DO NOTHING;

-- Function to generate request number
CREATE OR REPLACE FUNCTION public.generate_request_number(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_counter INTEGER;
  v_request_number TEXT;
BEGIN
  -- Get the company prefix
  SELECT prefix INTO v_prefix
  FROM public.company_request_prefixes
  WHERE company_id = p_company_id;
  
  IF v_prefix IS NULL THEN
    RAISE EXCEPTION 'No request prefix configured for company %', p_company_id;
  END IF;
  
  -- Increment and get the counter
  UPDATE public.company_request_counters
  SET counter = counter + 1, updated_at = now()
  WHERE company_id = p_company_id
  RETURNING counter INTO v_counter;
  
  -- If no counter exists, create one
  IF v_counter IS NULL THEN
    INSERT INTO public.company_request_counters (company_id, counter)
    VALUES (p_company_id, 1)
    RETURNING counter INTO v_counter;
  END IF;
  
  -- Format the request number with leading zeros (e.g., VRG-001)
  v_request_number := v_prefix || '-' || LPAD(v_counter::TEXT, 4, '0');
  
  RETURN v_request_number;
END;
$$;

-- Function to get assigned users for a department/sub-department
CREATE OR REPLACE FUNCTION public.get_assigned_users_for_department(
  p_company_id UUID,
  p_department TEXT,
  p_sub_department TEXT DEFAULT NULL,
  p_request_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  name TEXT,
  can_approve BOOLEAN,
  receive_notifications BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    dua.user_id,
    p.email,
    p.name,
    dua.can_approve,
    dua.receive_notifications
  FROM public.department_user_assignments dua
  JOIN public.profiles p ON p.user_id = dua.user_id
  WHERE dua.company_id = p_company_id
    AND dua.department = p_department
    AND (p_sub_department IS NULL OR dua.sub_department = p_sub_department OR dua.sub_department IS NULL)
    AND (p_request_type IS NULL OR dua.request_type = p_request_type OR dua.request_type IS NULL)
    AND dua.is_active = true
  ORDER BY dua.can_approve DESC, p.name;
$$;

-- Function to check if user is assigned to a department
CREATE OR REPLACE FUNCTION public.is_assigned_to_department(
  p_user_id UUID,
  p_company_id UUID,
  p_department TEXT,
  p_sub_department TEXT DEFAULT NULL,
  p_request_type TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.department_user_assignments
    WHERE user_id = p_user_id
      AND company_id = p_company_id
      AND department = p_department
      AND (p_sub_department IS NULL OR sub_department = p_sub_department OR sub_department IS NULL)
      AND (p_request_type IS NULL OR request_type = p_request_type OR request_type IS NULL)
      AND is_active = true
  );
$$;

-- Enable RLS on new tables
ALTER TABLE public.company_request_prefixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_request_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_user_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_request_prefixes
CREATE POLICY "Super admins can manage all prefixes"
  ON public.company_request_prefixes
  FOR ALL
  USING (has_global_role(auth.uid(), 'super_admin'::user_role))
  WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Tenant admins can manage their company prefix"
  ON public.company_request_prefixes
  FOR ALL
  USING (has_role(auth.uid(), company_id, 'tenant_admin'::user_role))
  WITH CHECK (has_role(auth.uid(), company_id, 'tenant_admin'::user_role));

CREATE POLICY "Users can view their company prefix"
  ON public.company_request_prefixes
  FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

-- RLS Policies for company_request_counters
CREATE POLICY "Only system can manage counters"
  ON public.company_request_counters
  FOR ALL
  USING (has_global_role(auth.uid(), 'super_admin'::user_role));

-- RLS Policies for department_user_assignments
CREATE POLICY "Super admins can manage all assignments"
  ON public.department_user_assignments
  FOR ALL
  USING (has_global_role(auth.uid(), 'super_admin'::user_role))
  WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Tenant admins can manage their company assignments"
  ON public.department_user_assignments
  FOR ALL
  USING (has_role(auth.uid(), company_id, 'tenant_admin'::user_role))
  WITH CHECK (has_role(auth.uid(), company_id, 'tenant_admin'::user_role));

CREATE POLICY "Users can view assignments for their company"
  ON public.department_user_assignments
  FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

-- Update RLS policies for department_requests to include assigned users
DROP POLICY IF EXISTS "Assigned users can view department requests" ON public.department_requests;
CREATE POLICY "Assigned users can view department requests"
  ON public.department_requests
  FOR SELECT
  USING (
    is_assigned_to_department(auth.uid(), company_id, department, sub_department, 'department')
  );

DROP POLICY IF EXISTS "Assigned users can update department requests" ON public.department_requests;
CREATE POLICY "Assigned users can update department requests"
  ON public.department_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.department_user_assignments
      WHERE user_id = auth.uid()
        AND company_id = department_requests.company_id
        AND department = department_requests.department
        AND (sub_department = department_requests.sub_department OR sub_department IS NULL)
        AND is_active = true
        AND (can_respond = true OR can_change_status = true OR can_approve = true)
    )
  );

-- Triggers to auto-generate request numbers
CREATE OR REPLACE FUNCTION public.auto_generate_request_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.request_number IS NULL THEN
    NEW.request_number := generate_request_number(NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Add triggers to all request tables
DROP TRIGGER IF EXISTS generate_hardware_request_number ON public.hardware_requests;
CREATE TRIGGER generate_hardware_request_number
  BEFORE INSERT ON public.hardware_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_request_number();

DROP TRIGGER IF EXISTS generate_marketing_request_number ON public.marketing_requests;
CREATE TRIGGER generate_marketing_request_number
  BEFORE INSERT ON public.marketing_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_request_number();

DROP TRIGGER IF EXISTS generate_user_account_request_number ON public.user_account_requests;
CREATE TRIGGER generate_user_account_request_number
  BEFORE INSERT ON public.user_account_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_request_number();

DROP TRIGGER IF EXISTS generate_department_request_number ON public.department_requests;
CREATE TRIGGER generate_department_request_number
  BEFORE INSERT ON public.department_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_request_number();

DROP TRIGGER IF EXISTS generate_toner_request_number ON public.toner_requests;
CREATE TRIGGER generate_toner_request_number
  BEFORE INSERT ON public.toner_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_request_number();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_department_user_assignments_lookup 
  ON public.department_user_assignments(company_id, department, sub_department, is_active);

CREATE INDEX IF NOT EXISTS idx_department_user_assignments_user 
  ON public.department_user_assignments(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_hardware_requests_number 
  ON public.hardware_requests(request_number);

CREATE INDEX IF NOT EXISTS idx_marketing_requests_number 
  ON public.marketing_requests(request_number);

CREATE INDEX IF NOT EXISTS idx_user_account_requests_number 
  ON public.user_account_requests(request_number);

CREATE INDEX IF NOT EXISTS idx_department_requests_number 
  ON public.department_requests(request_number);

CREATE INDEX IF NOT EXISTS idx_toner_requests_number 
  ON public.toner_requests(request_number);