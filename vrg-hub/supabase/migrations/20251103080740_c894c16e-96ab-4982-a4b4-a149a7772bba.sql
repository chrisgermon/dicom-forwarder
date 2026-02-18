-- Create user_invites table
CREATE TABLE IF NOT EXISTS public.user_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'requester',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(email, brand_id)
);

-- Enable RLS
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

-- Super admins and tenant admins can manage all invites
CREATE POLICY "Admins can manage all invites"
ON public.user_invites
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'tenant_admin', 'manager')
  )
);

-- Users can view invites sent to their email
CREATE POLICY "Users can view their own invites"
ON public.user_invites
FOR SELECT
USING (email = auth.email());

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_invites_email ON public.user_invites(email);
CREATE INDEX IF NOT EXISTS idx_user_invites_status ON public.user_invites(status);
CREATE INDEX IF NOT EXISTS idx_user_invites_expires_at ON public.user_invites(expires_at);

-- Add audit trigger
CREATE TRIGGER audit_user_invites
  AFTER INSERT OR UPDATE OR DELETE ON public.user_invites
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();