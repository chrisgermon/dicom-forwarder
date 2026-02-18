
-- ============================================
-- PHASE 1: Create New Enums and Tables
-- ============================================

-- Create platform role enum
CREATE TYPE public.platform_role AS ENUM (
  'platform_admin',
  'support_agent'
);

-- Create membership role enum (more granular than old user_role)
CREATE TYPE public.membership_role AS ENUM (
  'company_owner',
  'company_admin',
  'approver',
  'requester'
);

-- Create membership status enum
CREATE TYPE public.membership_status AS ENUM (
  'invited',
  'active',
  'suspended',
  'inactive'
);

-- Create platform_roles table (replaces super_admin in user_roles)
CREATE TABLE public.platform_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role platform_role NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create company_memberships table (many-to-many users<->companies)
CREATE TABLE public.company_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status membership_status NOT NULL DEFAULT 'active',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE,
  activated_at TIMESTAMP WITH TIME ZONE,
  deactivated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Create membership_roles table (many roles per membership)
CREATE TABLE public.membership_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES public.company_memberships(id) ON DELETE CASCADE,
  role membership_role NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(membership_id, role)
);

-- Enable RLS on new tables
ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PHASE 2: Migrate Existing Data
-- ============================================

-- Migrate super_admins to platform_roles
INSERT INTO public.platform_roles (user_id, role, granted_at)
SELECT 
  user_id,
  'platform_admin'::platform_role,
  created_at
FROM public.user_roles
WHERE role = 'super_admin';

-- Create company memberships from existing user_roles
INSERT INTO public.company_memberships (user_id, company_id, status, is_primary, activated_at)
SELECT 
  ur.user_id,
  ur.company_id,
  'active'::membership_status,
  true, -- All existing are primary for now
  ur.created_at
FROM public.user_roles ur;

-- Map old roles to new membership_roles
-- tenant_admin -> company_admin
-- manager -> approver
-- requester -> requester
-- super_admin gets company_admin for their company (if they have one)
INSERT INTO public.membership_roles (membership_id, role, granted_at)
SELECT 
  cm.id,
  CASE 
    WHEN ur.role = 'tenant_admin' THEN 'company_admin'::membership_role
    WHEN ur.role = 'manager' THEN 'approver'::membership_role
    WHEN ur.role = 'requester' THEN 'requester'::membership_role
    WHEN ur.role = 'super_admin' THEN 'company_admin'::membership_role
  END,
  ur.created_at
FROM public.user_roles ur
JOIN public.company_memberships cm ON cm.user_id = ur.user_id AND cm.company_id = ur.company_id;

-- ============================================
-- PHASE 3: Update profiles table
-- ============================================

-- Add primary_membership_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN primary_membership_id UUID REFERENCES public.company_memberships(id) ON DELETE SET NULL;

-- Populate primary_membership_id
UPDATE public.profiles p
SET primary_membership_id = cm.id
FROM public.company_memberships cm
WHERE p.user_id = cm.user_id 
  AND p.company_id = cm.company_id
  AND cm.is_primary = true;

-- ============================================
-- PHASE 4: Create New Helper Functions
-- ============================================

-- Check if user has platform role
CREATE OR REPLACE FUNCTION public.has_platform_role(_user_id UUID, _roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_roles
    WHERE user_id = _user_id
      AND role::text = ANY(_roles)
  )
$$;

-- Check if user has membership role in a company
CREATE OR REPLACE FUNCTION public.has_membership_role(_user_id UUID, _company_id UUID, _roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_memberships cm
    JOIN public.membership_roles mr ON mr.membership_id = cm.id
    WHERE cm.user_id = _user_id
      AND cm.company_id = _company_id
      AND cm.status = 'active'
      AND mr.role::text = ANY(_roles)
  )
$$;

-- Get user's primary company (backward compatibility)
CREATE OR REPLACE FUNCTION public.get_user_primary_company(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.company_memberships
  WHERE user_id = _user_id
    AND is_primary = true
    AND status = 'active'
  LIMIT 1
$$;

-- ============================================
-- PHASE 5: Create Compatibility Views & Functions
-- ============================================

-- Backward compatible has_role function (uses new tables)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _company_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE _role
      WHEN 'super_admin' THEN has_platform_role(_user_id, ARRAY['platform_admin'])
      WHEN 'tenant_admin' THEN has_membership_role(_user_id, _company_id, ARRAY['company_admin', 'company_owner'])
      WHEN 'manager' THEN has_membership_role(_user_id, _company_id, ARRAY['approver', 'company_admin', 'company_owner'])
      WHEN 'requester' THEN has_membership_role(_user_id, _company_id, ARRAY['requester', 'approver', 'company_admin', 'company_owner'])
      ELSE false
    END
$$;

-- Backward compatible has_global_role function
CREATE OR REPLACE FUNCTION public.has_global_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE _role
      WHEN 'super_admin' THEN has_platform_role(_user_id, ARRAY['platform_admin'])
      ELSE false
    END
$$;

-- Backward compatible get_user_company function
CREATE OR REPLACE FUNCTION public.get_user_company(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_user_primary_company(_user_id)
$$;

-- ============================================
-- PHASE 6: Add Indexes for Performance
-- ============================================

-- Platform roles indexes
CREATE INDEX idx_platform_roles_user_id ON public.platform_roles(user_id);
CREATE INDEX idx_platform_roles_role ON public.platform_roles(role);

-- Company memberships indexes
CREATE INDEX idx_company_memberships_user_id ON public.company_memberships(user_id);
CREATE INDEX idx_company_memberships_company_id ON public.company_memberships(company_id);
CREATE INDEX idx_company_memberships_status ON public.company_memberships(status);
CREATE INDEX idx_company_memberships_is_primary ON public.company_memberships(is_primary) WHERE is_primary = true;
CREATE INDEX idx_company_memberships_user_company ON public.company_memberships(user_id, company_id);

-- Membership roles indexes
CREATE INDEX idx_membership_roles_membership_id ON public.membership_roles(membership_id);
CREATE INDEX idx_membership_roles_role ON public.membership_roles(role);

-- ============================================
-- PHASE 7: RLS Policies for New Tables
-- ============================================

-- Platform Roles Policies
CREATE POLICY "Platform admins can view all platform roles"
ON public.platform_roles FOR SELECT
USING (has_platform_role(auth.uid(), ARRAY['platform_admin']));

CREATE POLICY "Platform admins can manage platform roles"
ON public.platform_roles FOR ALL
USING (has_platform_role(auth.uid(), ARRAY['platform_admin']))
WITH CHECK (has_platform_role(auth.uid(), ARRAY['platform_admin']));

-- Company Memberships Policies
CREATE POLICY "Users can view their own memberships"
ON public.company_memberships FOR SELECT
USING (user_id = auth.uid() OR has_platform_role(auth.uid(), ARRAY['platform_admin']));

CREATE POLICY "Company admins can view company memberships"
ON public.company_memberships FOR SELECT
USING (
  has_membership_role(auth.uid(), company_id, ARRAY['company_admin', 'company_owner']) OR
  has_platform_role(auth.uid(), ARRAY['platform_admin'])
);

CREATE POLICY "Company admins can manage memberships"
ON public.company_memberships FOR ALL
USING (
  has_membership_role(auth.uid(), company_id, ARRAY['company_admin', 'company_owner']) OR
  has_platform_role(auth.uid(), ARRAY['platform_admin'])
);

-- Membership Roles Policies
CREATE POLICY "Users can view their membership roles"
ON public.membership_roles FOR SELECT
USING (
  membership_id IN (
    SELECT id FROM public.company_memberships WHERE user_id = auth.uid()
  ) OR
  has_platform_role(auth.uid(), ARRAY['platform_admin'])
);

CREATE POLICY "Company admins can view membership roles"
ON public.membership_roles FOR SELECT
USING (
  membership_id IN (
    SELECT cm.id FROM public.company_memberships cm
    WHERE has_membership_role(auth.uid(), cm.company_id, ARRAY['company_admin', 'company_owner'])
  ) OR
  has_platform_role(auth.uid(), ARRAY['platform_admin'])
);

CREATE POLICY "Company admins can manage membership roles"
ON public.membership_roles FOR ALL
USING (
  membership_id IN (
    SELECT cm.id FROM public.company_memberships cm
    WHERE has_membership_role(auth.uid(), cm.company_id, ARRAY['company_admin', 'company_owner'])
  ) OR
  has_platform_role(auth.uid(), ARRAY['platform_admin'])
);

-- ============================================
-- PHASE 8: Add Triggers
-- ============================================

-- Trigger to update company_memberships updated_at
CREATE OR REPLACE FUNCTION public.update_company_membership_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_company_memberships_updated_at
BEFORE UPDATE ON public.company_memberships
FOR EACH ROW
EXECUTE FUNCTION public.update_company_membership_updated_at();

-- Trigger to ensure only one primary membership per user
CREATE OR REPLACE FUNCTION public.ensure_single_primary_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_primary = true THEN
    -- Unset other primary memberships for this user
    UPDATE public.company_memberships
    SET is_primary = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_single_primary_membership
BEFORE INSERT OR UPDATE ON public.company_memberships
FOR EACH ROW
WHEN (NEW.is_primary = true)
EXECUTE FUNCTION public.ensure_single_primary_membership();

-- ============================================
-- PHASE 9: Add Comments for Documentation
-- ============================================

COMMENT ON TABLE public.platform_roles IS 'Global platform-level roles (platform_admin, support_agent)';
COMMENT ON TABLE public.company_memberships IS 'Many-to-many relationship between users and companies with status tracking';
COMMENT ON TABLE public.membership_roles IS 'Roles assigned to users within a specific company membership';

COMMENT ON COLUMN public.company_memberships.is_primary IS 'Users primary/default company for single-company UX compatibility';
COMMENT ON COLUMN public.company_memberships.status IS 'Membership lifecycle: invited -> active -> suspended/inactive';
