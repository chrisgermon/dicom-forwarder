-- Create email_logs table to track sent emails
CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.hardware_requests(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  email_type text NOT NULL, -- 'request_submitted', 'request_approved', 'request_declined', 'request_ordered'
  subject text NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'pending'
  error_message text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view email logs for their requests"
ON public.email_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.hardware_requests hr
    WHERE hr.id = email_logs.request_id
    AND hr.user_id = auth.uid()
  )
);

CREATE POLICY "Managers can view email logs for their company requests"
ON public.email_logs
FOR SELECT
USING (
  has_role(auth.uid(), (
    SELECT hr.company_id FROM public.hardware_requests hr
    WHERE hr.id = email_logs.request_id
  ), 'manager'::user_role)
  OR has_role(auth.uid(), (
    SELECT hr.company_id FROM public.hardware_requests hr
    WHERE hr.id = email_logs.request_id
  ), 'tenant_admin'::user_role)
  OR has_global_role(auth.uid(), 'super_admin'::user_role)
);

CREATE POLICY "System can insert email logs"
ON public.email_logs
FOR INSERT
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_email_logs_request_id ON public.email_logs(request_id);
CREATE INDEX idx_email_logs_sent_at ON public.email_logs(sent_at);