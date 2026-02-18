-- Create marketing request type enum
CREATE TYPE marketing_request_type AS ENUM ('fax_blast', 'email_blast', 'website_update');

-- Create recurrence frequency enum
CREATE TYPE recurrence_frequency AS ENUM ('daily', 'weekly', 'biweekly', 'monthly');

-- Create marketing_requests table
CREATE TABLE public.marketing_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  request_type marketing_request_type NOT NULL,
  business_justification TEXT NOT NULL,
  
  -- For fax/email blasts
  recipient_list_file_path TEXT,
  document_file_paths TEXT[], -- Array of file paths or URLs
  document_urls TEXT[],
  
  -- For website updates
  website_update_details TEXT,
  
  -- Scheduling
  scheduled_send_date TIMESTAMP WITH TIME ZONE,
  scheduled_send_time TIME,
  
  -- Recurring options
  is_recurring BOOLEAN DEFAULT false,
  recurrence_frequency recurrence_frequency,
  recurrence_end_date DATE,
  
  -- Status tracking
  status request_status NOT NULL DEFAULT 'submitted',
  priority request_priority NOT NULL DEFAULT 'medium',
  
  -- Approval tracking
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

-- Enable Row Level Security
ALTER TABLE public.marketing_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for marketing_requests
CREATE POLICY "Users can create their own marketing requests" 
ON public.marketing_requests 
FOR INSERT 
WITH CHECK ((user_id = auth.uid()) AND (company_id = get_user_company(auth.uid())));

CREATE POLICY "Users can view their own marketing requests" 
ON public.marketing_requests 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own draft/submitted requests" 
ON public.marketing_requests 
FOR UPDATE 
USING ((user_id = auth.uid()) AND (status = ANY (ARRAY['draft'::request_status, 'submitted'::request_status])));

CREATE POLICY "Managers can view company marketing requests" 
ON public.marketing_requests 
FOR SELECT 
USING (has_role(auth.uid(), get_user_company(auth.uid()), 'manager'::user_role) OR 
       has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin'::user_role) OR 
       has_global_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Managers can update marketing requests for approval" 
ON public.marketing_requests 
FOR UPDATE 
USING (has_role(auth.uid(), get_user_company(auth.uid()), 'manager'::user_role) OR 
       has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin'::user_role) OR 
       has_global_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Super admins can create marketing requests for any company" 
ON public.marketing_requests 
FOR INSERT 
WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Create marketing_request_attachments table
CREATE TABLE public.marketing_request_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.marketing_requests(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  attachment_type TEXT DEFAULT 'document', -- 'document', 'recipient_list'
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on attachments
ALTER TABLE public.marketing_request_attachments ENABLE ROW LEVEL SECURITY;

-- Policies for marketing attachments
CREATE POLICY "Users can manage attachments in their requests" 
ON public.marketing_request_attachments 
FOR ALL 
USING ((uploaded_by = auth.uid()) OR 
       (EXISTS (SELECT 1 FROM public.marketing_requests mr 
                WHERE mr.id = marketing_request_attachments.request_id 
                AND mr.user_id = auth.uid())));

CREATE POLICY "Managers can view all marketing request attachments" 
ON public.marketing_request_attachments 
FOR SELECT 
USING (has_role(auth.uid(), 
               (SELECT company_id FROM public.marketing_requests 
                WHERE id = marketing_request_attachments.request_id), 
               'manager'::user_role) OR 
       has_role(auth.uid(), 
               (SELECT company_id FROM public.marketing_requests 
                WHERE id = marketing_request_attachments.request_id), 
               'tenant_admin'::user_role) OR 
       has_global_role(auth.uid(), 'super_admin'::user_role));

-- Create trigger for updated_at
CREATE TRIGGER update_marketing_requests_updated_at
BEFORE UPDATE ON public.marketing_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create status history tracking for marketing requests
CREATE TABLE public.marketing_request_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.marketing_requests(id) ON DELETE CASCADE,
  status request_status NOT NULL,
  changed_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_request_status_history ENABLE ROW LEVEL SECURITY;

-- Policies for status history
CREATE POLICY "Users can view status history of their requests" 
ON public.marketing_request_status_history 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.marketing_requests mr 
               WHERE mr.id = marketing_request_status_history.request_id 
               AND mr.user_id = auth.uid()));

CREATE POLICY "Managers can view all marketing request status history" 
ON public.marketing_request_status_history 
FOR SELECT 
USING (has_role(auth.uid(), 
               (SELECT company_id FROM public.marketing_requests 
                WHERE id = marketing_request_status_history.request_id), 
               'manager'::user_role) OR 
       has_role(auth.uid(), 
               (SELECT company_id FROM public.marketing_requests 
                WHERE id = marketing_request_status_history.request_id), 
               'tenant_admin'::user_role) OR 
       has_global_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Authorized users can add status history" 
ON public.marketing_request_status_history 
FOR INSERT 
WITH CHECK (changed_by = auth.uid());

-- Create storage bucket for marketing request files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('marketing-requests', 'marketing-requests', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for marketing requests
CREATE POLICY "Users can upload their own marketing files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'marketing-requests' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own marketing files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'marketing-requests' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Managers can view all company marketing files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'marketing-requests' AND 
       EXISTS (SELECT 1 FROM public.marketing_requests mr
               WHERE mr.user_id::text = (storage.foldername(name))[1]
               AND (has_role(auth.uid(), mr.company_id, 'manager'::user_role) OR
                    has_role(auth.uid(), mr.company_id, 'tenant_admin'::user_role) OR
                    has_global_role(auth.uid(), 'super_admin'::user_role))));