-- Create table for secure order confirmation tokens
CREATE TABLE IF NOT EXISTS public.order_confirmation_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.hardware_requests(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  used_at TIMESTAMP WITH TIME ZONE,
  used_by_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_confirmation_tokens ENABLE ROW LEVEL SECURITY;

-- Public can use valid tokens
CREATE POLICY "Anyone can use valid tokens"
ON public.order_confirmation_tokens
FOR SELECT
USING (expires_at > now() AND used_at IS NULL);

-- System can insert tokens
CREATE POLICY "System can insert tokens"
ON public.order_confirmation_tokens
FOR INSERT
WITH CHECK (true);

-- System can update tokens when used
CREATE POLICY "System can update used tokens"
ON public.order_confirmation_tokens
FOR UPDATE
USING (true);

-- Create index for faster token lookups
CREATE INDEX idx_order_tokens_token ON public.order_confirmation_tokens(token);
CREATE INDEX idx_order_tokens_request ON public.order_confirmation_tokens(request_id);

-- Add trigger for updated_at
CREATE TRIGGER update_order_confirmation_tokens_updated_at
BEFORE UPDATE ON public.order_confirmation_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();