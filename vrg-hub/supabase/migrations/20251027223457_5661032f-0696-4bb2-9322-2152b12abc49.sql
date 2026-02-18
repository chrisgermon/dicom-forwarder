-- Add fields to tickets table to support all request types
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS request_type_id uuid REFERENCES public.request_types(id),
ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id),
ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id),
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tickets_request_type ON public.tickets(request_type_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at DESC);

-- Update RLS policies for tickets table
DROP POLICY IF EXISTS "Users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Managers can update tickets" ON public.tickets;

CREATE POLICY "Users can create their own tickets"
ON public.tickets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tickets"
ON public.tickets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins and managers can view all tickets"
ON public.tickets
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'tenant_admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  auth.uid() = assigned_to
);

CREATE POLICY "Managers and admins can update tickets"
ON public.tickets
FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'tenant_admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  auth.uid() = assigned_to
);

CREATE POLICY "Users can update their own draft tickets"
ON public.tickets
FOR UPDATE
USING (auth.uid() = user_id AND status = 'inbox')
WITH CHECK (auth.uid() = user_id);