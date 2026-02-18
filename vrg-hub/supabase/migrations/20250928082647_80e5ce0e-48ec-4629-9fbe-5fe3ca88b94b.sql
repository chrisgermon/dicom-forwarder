-- Create request_comments table
CREATE TABLE public.request_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for request comments
CREATE POLICY "Users can view comments on requests they can access" 
ON public.request_comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.hardware_requests hr 
    WHERE hr.id = request_comments.request_id 
    AND (
      hr.user_id = auth.uid() 
      OR has_role(auth.uid(), hr.company_id, 'manager'::user_role)
      OR has_role(auth.uid(), hr.company_id, 'tenant_admin'::user_role)
      OR has_global_role(auth.uid(), 'super_admin'::user_role)
    )
  )
);

CREATE POLICY "Users can create comments on requests they can access" 
ON public.request_comments 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 
    FROM public.hardware_requests hr 
    WHERE hr.id = request_comments.request_id 
    AND (
      hr.user_id = auth.uid() 
      OR has_role(auth.uid(), hr.company_id, 'manager'::user_role)
      OR has_role(auth.uid(), hr.company_id, 'tenant_admin'::user_role)
      OR has_global_role(auth.uid(), 'super_admin'::user_role)
    )
  )
);

CREATE POLICY "Users can update their own comments" 
ON public.request_comments 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" 
ON public.request_comments 
FOR DELETE 
USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_request_comments_updated_at
  BEFORE UPDATE ON public.request_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_request_comments_request_id ON public.request_comments(request_id);
CREATE INDEX idx_request_comments_user_id ON public.request_comments(user_id);