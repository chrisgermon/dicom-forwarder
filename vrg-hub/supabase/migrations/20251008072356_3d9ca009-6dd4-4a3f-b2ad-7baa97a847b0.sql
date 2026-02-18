-- Add missing columns to existing request_attachments table
ALTER TABLE public.request_attachments 
ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'hardware' CHECK (request_type IN ('hardware', 'marketing', 'toner', 'user_account', 'user_offboarding', 'department'));

ALTER TABLE public.request_attachments 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

ALTER TABLE public.request_attachments
ALTER COLUMN file_size TYPE BIGINT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_request_attachments_request ON public.request_attachments(request_type, request_id);
CREATE INDEX IF NOT EXISTS idx_request_attachments_uploaded_by ON public.request_attachments(uploaded_by);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own request attachments" ON public.request_attachments;
DROP POLICY IF EXISTS "Users can insert their own request attachments" ON public.request_attachments;
DROP POLICY IF EXISTS "Managers can view company request attachments" ON public.request_attachments;
DROP POLICY IF EXISTS "Users can delete their own request attachments" ON public.request_attachments;

-- RLS Policies for request_attachments
CREATE POLICY "Users can view their own request attachments"
  ON public.request_attachments FOR SELECT
  USING (uploaded_by = auth.uid());

CREATE POLICY "Users can insert their own request attachments"
  ON public.request_attachments FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Managers can view company request attachments"
  ON public.request_attachments FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM public.hardware_requests WHERE company_id = get_user_company(auth.uid())
      UNION
      SELECT id FROM public.marketing_requests WHERE company_id = get_user_company(auth.uid())
      UNION
      SELECT id FROM public.toner_requests WHERE company_id = get_user_company(auth.uid())
      UNION
      SELECT id FROM public.user_account_requests WHERE company_id = get_user_company(auth.uid())
      UNION
      SELECT id FROM public.user_offboarding_requests WHERE company_id = get_user_company(auth.uid())
      UNION
      SELECT id FROM public.department_requests WHERE company_id = get_user_company(auth.uid())
    )
    AND (
      has_role(auth.uid(), get_user_company(auth.uid()), 'manager'::user_role) OR
      has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin'::user_role) OR
      has_global_role(auth.uid(), 'super_admin'::user_role)
    )
  );

CREATE POLICY "Users can delete their own request attachments"
  ON public.request_attachments FOR DELETE
  USING (uploaded_by = auth.uid());

-- Add trigger to update updated_at column
DROP TRIGGER IF EXISTS update_request_attachments_updated_at ON public.request_attachments;
CREATE TRIGGER update_request_attachments_updated_at
  BEFORE UPDATE ON public.request_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();