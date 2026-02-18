-- Create toner_requests table for single-tenant mode
CREATE TABLE IF NOT EXISTS public.toner_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  brand_id uuid REFERENCES public.brands(id),
  location_id uuid REFERENCES public.locations(id),
  title text NOT NULL,
  description text,
  printer_model text,
  toner_type text,
  quantity integer NOT NULL DEFAULT 1,
  colors_required text[],
  urgency text NOT NULL DEFAULT 'normal',
  site text,
  predicted_toner_models text,
  eta_delivery date,
  tracking_link text,
  status text NOT NULL DEFAULT 'submitted',
  priority text NOT NULL DEFAULT 'medium',
  assigned_to uuid REFERENCES auth.users(id),
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.toner_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for toner requests
CREATE POLICY "Users can view their own toner requests"
  ON public.toner_requests
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'tenant_admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Users can create their own toner requests"
  ON public.toner_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own draft toner requests"
  ON public.toner_requests
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'draft')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers and admins can update toner requests"
  ON public.toner_requests
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'tenant_admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_toner_requests_user_id ON public.toner_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_toner_requests_status ON public.toner_requests(status);
CREATE INDEX IF NOT EXISTS idx_toner_requests_created_at ON public.toner_requests(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_toner_requests_updated_at
  BEFORE UPDATE ON public.toner_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
