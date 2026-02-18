-- Create enum for request status
CREATE TYPE public.request_status AS ENUM (
  'draft',
  'submitted',
  'pending_manager_approval',
  'pending_admin_approval', 
  'approved',
  'declined',
  'ordered',
  'delivered',
  'cancelled'
);

-- Create enum for request priority
CREATE TYPE public.request_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- Create hardware_requests table
CREATE TABLE public.hardware_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  business_justification TEXT NOT NULL,
  priority public.request_priority NOT NULL DEFAULT 'medium',
  status public.request_status NOT NULL DEFAULT 'draft',
  total_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  expected_delivery_date DATE,
  manager_id UUID,
  manager_approved_at TIMESTAMP WITH TIME ZONE,
  manager_approval_notes TEXT,
  admin_id UUID,
  admin_approved_at TIMESTAMP WITH TIME ZONE,
  admin_approval_notes TEXT,
  declined_by UUID,
  declined_at TIMESTAMP WITH TIME ZONE,
  decline_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create request_items table
CREATE TABLE public.request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.hardware_requests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  vendor TEXT,
  model_number TEXT,
  specifications JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create request_attachments table for file uploads
CREATE TABLE public.request_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.hardware_requests(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  uploaded_by UUID NOT NULL,
  attachment_type TEXT DEFAULT 'general', -- receipt, quote, specification, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create request_status_history table for tracking
CREATE TABLE public.request_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.hardware_requests(id) ON DELETE CASCADE,
  status public.request_status NOT NULL,
  changed_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.hardware_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_status_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for hardware_requests
CREATE POLICY "Users can view their own requests" ON public.hardware_requests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own requests" ON public.hardware_requests
  FOR INSERT WITH CHECK (user_id = auth.uid() AND company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can update their own draft requests" ON public.hardware_requests
  FOR UPDATE USING (user_id = auth.uid() AND status IN ('draft', 'submitted'));

CREATE POLICY "Managers can view team requests" ON public.hardware_requests
  FOR SELECT USING (
    has_role(auth.uid(), get_user_company(auth.uid()), 'manager') OR
    has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin') OR
    has_global_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Managers can update requests for approval" ON public.hardware_requests
  FOR UPDATE USING (
    has_role(auth.uid(), get_user_company(auth.uid()), 'manager') OR
    has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin') OR
    has_global_role(auth.uid(), 'super_admin')
  );

-- RLS policies for request_items
CREATE POLICY "Users can manage items in their requests" ON public.request_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.hardware_requests hr 
      WHERE hr.id = request_id AND hr.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can view all request items" ON public.request_items
  FOR SELECT USING (
    has_role(auth.uid(), (SELECT company_id FROM public.hardware_requests WHERE id = request_id), 'manager') OR
    has_role(auth.uid(), (SELECT company_id FROM public.hardware_requests WHERE id = request_id), 'tenant_admin') OR
    has_global_role(auth.uid(), 'super_admin')
  );

-- RLS policies for request_attachments
CREATE POLICY "Users can manage attachments in their requests" ON public.request_attachments
  FOR ALL USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.hardware_requests hr 
      WHERE hr.id = request_id AND hr.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can view all request attachments" ON public.request_attachments
  FOR SELECT USING (
    has_role(auth.uid(), (SELECT company_id FROM public.hardware_requests WHERE id = request_id), 'manager') OR
    has_role(auth.uid(), (SELECT company_id FROM public.hardware_requests WHERE id = request_id), 'tenant_admin') OR
    has_global_role(auth.uid(), 'super_admin')
  );

-- RLS policies for request_status_history
CREATE POLICY "Users can view status history of their requests" ON public.request_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.hardware_requests hr 
      WHERE hr.id = request_id AND hr.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can view all request status history" ON public.request_status_history
  FOR SELECT USING (
    has_role(auth.uid(), (SELECT company_id FROM public.hardware_requests WHERE id = request_id), 'manager') OR
    has_role(auth.uid(), (SELECT company_id FROM public.hardware_requests WHERE id = request_id), 'tenant_admin') OR
    has_global_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Authorized users can add status history" ON public.request_status_history
  FOR INSERT WITH CHECK (changed_by = auth.uid());

-- Create storage bucket for request attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('request-attachments', 'request-attachments', false);

-- Storage policies for request attachments
CREATE POLICY "Users can upload attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'request-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'request-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Managers can view all request attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'request-attachments' AND
    (has_role(auth.uid(), get_user_company(auth.uid()), 'manager') OR
     has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin') OR
     has_global_role(auth.uid(), 'super_admin'))
  );

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_hardware_requests_updated_at
  BEFORE UPDATE ON public.hardware_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically update total amount when items change
CREATE OR REPLACE FUNCTION public.update_request_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the total amount for the request
  UPDATE public.hardware_requests
  SET total_amount = (
    SELECT COALESCE(SUM(total_price), 0)
    FROM public.request_items
    WHERE request_id = COALESCE(NEW.request_id, OLD.request_id)
  )
  WHERE id = COALESCE(NEW.request_id, OLD.request_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers to update total amount
CREATE TRIGGER update_request_total_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON public.request_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_request_total();

-- Create function to track status changes
CREATE OR REPLACE FUNCTION public.track_request_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.request_status_history (request_id, status, changed_by, notes)
    VALUES (NEW.id, NEW.status, auth.uid(), 'Status changed from ' || OLD.status || ' to ' || NEW.status);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for status tracking
CREATE TRIGGER track_request_status_changes
  AFTER UPDATE ON public.hardware_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.track_request_status_change();