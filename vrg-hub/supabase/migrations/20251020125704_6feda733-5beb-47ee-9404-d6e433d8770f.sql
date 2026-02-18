-- Create request_comments table for ticket-style responses
CREATE TABLE public.request_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT,
  is_internal BOOLEAN DEFAULT false,
  email_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;

-- Policies for request comments
CREATE POLICY "Users can view comments on their requests"
  ON public.request_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hardware_requests
      WHERE id = request_comments.request_id
      AND (user_id = auth.uid() OR 
           has_role(auth.uid(), 'manager'::app_role) OR 
           has_role(auth.uid(), 'tenant_admin'::app_role) OR 
           has_role(auth.uid(), 'super_admin'::app_role))
    )
  );

CREATE POLICY "Users can create comments on requests they can access"
  ON public.request_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hardware_requests
      WHERE id = request_comments.request_id
      AND (user_id = auth.uid() OR 
           has_role(auth.uid(), 'manager'::app_role) OR 
           has_role(auth.uid(), 'tenant_admin'::app_role) OR 
           has_role(auth.uid(), 'super_admin'::app_role))
    )
  );

CREATE POLICY "System can insert comments from emails"
  ON public.request_comments
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_request_comments_request_id ON public.request_comments(request_id);
CREATE INDEX idx_request_comments_email_message_id ON public.request_comments(email_message_id);

-- Create trigger for updated_at
CREATE TRIGGER update_request_comments_updated_at
  BEFORE UPDATE ON public.request_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();