-- Create beta_feedback table to log all feedback submissions
CREATE TABLE public.beta_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('feedback', 'bug', 'feature_request')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  page_url TEXT,
  browser_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.beta_feedback
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback"
ON public.beta_feedback
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Super admins can view all feedback
CREATE POLICY "Super admins can view all feedback"
ON public.beta_feedback
FOR SELECT
USING (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Create index for better query performance
CREATE INDEX idx_beta_feedback_user_id ON public.beta_feedback(user_id);
CREATE INDEX idx_beta_feedback_created_at ON public.beta_feedback(created_at DESC);
CREATE INDEX idx_beta_feedback_type ON public.beta_feedback(feedback_type);

-- Add audit trigger for feedback
CREATE TRIGGER audit_beta_feedback
AFTER INSERT OR UPDATE OR DELETE ON public.beta_feedback
FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();