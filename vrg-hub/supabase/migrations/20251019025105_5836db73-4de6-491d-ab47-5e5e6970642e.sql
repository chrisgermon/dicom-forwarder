-- RBAC System with Per-User Overrides
-- This replaces the simple enum-based role system with a flexible RBAC model

-- Drop existing simple role constraints (we'll migrate data later)
-- Keep user_roles table but change structure

-- 1. Roles table (expanded from existing)
CREATE TABLE IF NOT EXISTS public.rbac_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Permissions catalog (resource:action model)
CREATE TABLE IF NOT EXISTS public.rbac_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(resource, action)
);

-- 3. Role permissions (what each role can do)
CREATE TABLE IF NOT EXISTS public.rbac_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.rbac_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.rbac_permissions(id) ON DELETE CASCADE,
  effect TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- 4. User roles (many-to-many)
CREATE TABLE IF NOT EXISTS public.rbac_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.rbac_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- 5. User permission overrides (per-user allow/deny)
CREATE TABLE IF NOT EXISTS public.rbac_user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.rbac_permissions(id) ON DELETE CASCADE,
  effect TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, permission_id)
);

-- 6. Audit log for permission changes
CREATE TABLE IF NOT EXISTS public.rbac_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_state JSONB,
  after_state JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add updated_at triggers
CREATE TRIGGER update_rbac_roles_updated_at
  BEFORE UPDATE ON public.rbac_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rbac_user_permissions_updated_at
  BEFORE UPDATE ON public.rbac_user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.rbac_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Super admins can manage everything
CREATE POLICY "Super admins manage rbac_roles"
  ON public.rbac_roles FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins manage rbac_permissions"
  ON public.rbac_permissions FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins manage rbac_role_permissions"
  ON public.rbac_role_permissions FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins manage rbac_user_roles"
  ON public.rbac_user_roles FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins manage rbac_user_permissions"
  ON public.rbac_user_permissions FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Users can view their own roles and permissions
CREATE POLICY "Users view own rbac_user_roles"
  ON public.rbac_user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users view own rbac_user_permissions"
  ON public.rbac_user_permissions FOR SELECT
  USING (auth.uid() = user_id);

-- All authenticated users can view roles and permissions catalog
CREATE POLICY "Users view rbac_roles"
  ON public.rbac_roles FOR SELECT
  USING (true);

CREATE POLICY "Users view rbac_permissions"
  ON public.rbac_permissions FOR SELECT
  USING (true);

CREATE POLICY "Users view rbac_role_permissions"
  ON public.rbac_role_permissions FOR SELECT
  USING (true);

-- Audit log: admins can view
CREATE POLICY "Admins view rbac_audit_log"
  ON public.rbac_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_rbac_role_permissions_role ON public.rbac_role_permissions(role_id);
CREATE INDEX idx_rbac_role_permissions_permission ON public.rbac_role_permissions(permission_id);
CREATE INDEX idx_rbac_user_roles_user ON public.rbac_user_roles(user_id);
CREATE INDEX idx_rbac_user_roles_role ON public.rbac_user_roles(role_id);
CREATE INDEX idx_rbac_user_permissions_user ON public.rbac_user_permissions(user_id);
CREATE INDEX idx_rbac_user_permissions_permission ON public.rbac_user_permissions(permission_id);
CREATE INDEX idx_rbac_permissions_resource_action ON public.rbac_permissions(resource, action);
CREATE INDEX idx_rbac_audit_log_user ON public.rbac_audit_log(user_id);
CREATE INDEX idx_rbac_audit_log_created ON public.rbac_audit_log(created_at DESC);