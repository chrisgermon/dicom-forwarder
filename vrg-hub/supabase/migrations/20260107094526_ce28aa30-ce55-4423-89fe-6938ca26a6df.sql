-- Create request handler groups table
CREATE TABLE public.request_handler_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create group members junction table
CREATE TABLE public.request_handler_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.request_handler_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Add assigned_group_id to hardware_requests
ALTER TABLE public.hardware_requests 
ADD COLUMN IF NOT EXISTS assigned_group_id UUID REFERENCES public.request_handler_groups(id) ON DELETE SET NULL;

-- Add assigned_group_id to marketing_requests
ALTER TABLE public.marketing_requests 
ADD COLUMN IF NOT EXISTS assigned_group_id UUID REFERENCES public.request_handler_groups(id) ON DELETE SET NULL;

-- Add assigned_group_id to tickets
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS assigned_group_id UUID REFERENCES public.request_handler_groups(id) ON DELETE SET NULL;

-- Add assigned_group_id to incidents
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS assigned_group_id UUID REFERENCES public.request_handler_groups(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.request_handler_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_handler_group_members ENABLE ROW LEVEL SECURITY;

-- Function to check if user is in a handler group
CREATE OR REPLACE FUNCTION public.is_in_handler_group(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.request_handler_group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
  );
$$;

-- Function to check if user is in any handler group for a department
CREATE OR REPLACE FUNCTION public.is_handler_for_department(_user_id UUID, _department_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.request_handler_group_members ghm
    JOIN public.request_handler_groups hg ON ghm.group_id = hg.id
    WHERE ghm.user_id = _user_id
      AND hg.department_id = _department_id
      AND hg.is_active = true
  );
$$;

-- Function to get handler group for department
CREATE OR REPLACE FUNCTION public.get_department_handler_group(_department_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.request_handler_groups
  WHERE department_id = _department_id
    AND is_active = true
  LIMIT 1;
$$;

-- RLS Policies for request_handler_groups
CREATE POLICY "Admins can manage handler groups"
ON public.request_handler_groups
FOR ALL
TO authenticated
USING (public.is_admin_or_manager());

CREATE POLICY "Authenticated users can view active handler groups"
ON public.request_handler_groups
FOR SELECT
TO authenticated
USING (is_active = true);

-- RLS Policies for request_handler_group_members
CREATE POLICY "Admins can manage group members"
ON public.request_handler_group_members
FOR ALL
TO authenticated
USING (public.is_admin_or_manager());

CREATE POLICY "Users can view their own group memberships"
ON public.request_handler_group_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can view members of groups they belong to"
ON public.request_handler_group_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.request_handler_group_members m
    WHERE m.group_id = request_handler_group_members.group_id
    AND m.user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_handler_groups_department ON public.request_handler_groups(department_id);
CREATE INDEX idx_handler_group_members_user ON public.request_handler_group_members(user_id);
CREATE INDEX idx_handler_group_members_group ON public.request_handler_group_members(group_id);
CREATE INDEX idx_hardware_requests_assigned_group ON public.hardware_requests(assigned_group_id);
CREATE INDEX idx_marketing_requests_assigned_group ON public.marketing_requests(assigned_group_id);
CREATE INDEX idx_tickets_assigned_group ON public.tickets(assigned_group_id);
CREATE INDEX idx_incidents_assigned_group ON public.incidents(assigned_group_id);

-- Trigger to update updated_at
CREATE TRIGGER update_request_handler_groups_updated_at
BEFORE UPDATE ON public.request_handler_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();