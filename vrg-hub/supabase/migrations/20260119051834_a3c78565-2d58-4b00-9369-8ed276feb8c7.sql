-- Add MLO and MLO Manager roles to rbac_roles
INSERT INTO public.rbac_roles (name, description)
VALUES 
  ('mlo', 'Medical Liaison Officer - can manage their own visits and view their assigned sites'),
  ('mlo_manager', 'MLO Manager - can view and manage all MLO visits, assignments, and targets')
ON CONFLICT (name) DO NOTHING;

-- Create helper function to check if user is MLO Manager
CREATE OR REPLACE FUNCTION public.is_mlo_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rbac_user_roles ur
    JOIN public.rbac_roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id
      AND r.name = 'mlo_manager'
  )
$$;

-- Drop existing MLO-related policies to recreate with proper access control
DROP POLICY IF EXISTS "Admins can manage all assignments" ON public.mlo_assignments;
DROP POLICY IF EXISTS "Users can view own assignments" ON public.mlo_assignments;
DROP POLICY IF EXISTS "Admins can manage all targets" ON public.mlo_targets;
DROP POLICY IF EXISTS "Users can view own targets" ON public.mlo_targets;
DROP POLICY IF EXISTS "Admins can view all visits" ON public.mlo_visits;
DROP POLICY IF EXISTS "Users can manage own visits" ON public.mlo_visits;

-- New RLS Policies for mlo_assignments

-- Super admins, tenant admins, and MLO managers can manage all assignments
CREATE POLICY "Admins and MLO managers can manage all assignments"
ON public.mlo_assignments
FOR ALL
TO authenticated
USING (
  public.is_admin_or_manager() 
  OR public.is_mlo_manager(auth.uid())
);

-- MLOs can view their own assignments
CREATE POLICY "MLOs can view own assignments"
ON public.mlo_assignments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- New RLS Policies for mlo_targets

-- Super admins, tenant admins, and MLO managers can manage all targets
CREATE POLICY "Admins and MLO managers can manage all targets"
ON public.mlo_targets
FOR ALL
TO authenticated
USING (
  public.is_admin_or_manager()
  OR public.is_mlo_manager(auth.uid())
);

-- MLOs can view their own targets
CREATE POLICY "MLOs can view own targets"
ON public.mlo_targets
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- New RLS Policies for mlo_visits

-- Super admins, tenant admins, and MLO managers can view all visits
CREATE POLICY "Admins and MLO managers can view all visits"
ON public.mlo_visits
FOR SELECT
TO authenticated
USING (
  public.is_admin_or_manager()
  OR public.is_mlo_manager(auth.uid())
);

-- MLO managers can also update/delete any visit
CREATE POLICY "Admins and MLO managers can manage all visits"
ON public.mlo_visits
FOR ALL
TO authenticated
USING (
  public.is_admin_or_manager()
  OR public.is_mlo_manager(auth.uid())
);

-- MLOs can manage their own visits
CREATE POLICY "MLOs can manage own visits"
ON public.mlo_visits
FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Same for mlo_calendar_sync table
DROP POLICY IF EXISTS "Users can view own sync records" ON public.mlo_calendar_sync;
DROP POLICY IF EXISTS "Users can manage own sync records" ON public.mlo_calendar_sync;

-- MLO managers and admins can view all sync records
CREATE POLICY "Admins and MLO managers can view all sync records"
ON public.mlo_calendar_sync
FOR SELECT
TO authenticated
USING (
  public.is_admin_or_manager()
  OR public.is_mlo_manager(auth.uid())
);

-- Users can manage their own sync records
CREATE POLICY "Users can manage own sync records"
ON public.mlo_calendar_sync
FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Add MLO permissions to rbac_permissions if they don't exist
INSERT INTO public.rbac_permissions (resource, action, description)
VALUES 
  ('mlo', 'view_dashboard', 'View MLO dashboard'),
  ('mlo', 'view_visits', 'View own MLO visits'),
  ('mlo', 'create_visit', 'Create MLO visits'),
  ('mlo', 'edit_visit', 'Edit own MLO visits'),
  ('mlo', 'delete_visit', 'Delete own MLO visits'),
  ('mlo', 'view_targets', 'View own MLO targets'),
  ('mlo', 'view_all_visits', 'View all MLO visits (manager)'),
  ('mlo', 'view_all_targets', 'View all MLO targets (manager)'),
  ('mlo', 'manage_assignments', 'Manage MLO site assignments'),
  ('mlo', 'manage_targets', 'Set and manage MLO targets'),
  ('mlo', 'export_reports', 'Export MLO performance reports')
ON CONFLICT (resource, action) DO NOTHING;

-- Assign permissions to mlo role
INSERT INTO public.rbac_role_permissions (role_id, permission_id, effect)
SELECT r.id, p.id, 'allow'
FROM public.rbac_roles r, public.rbac_permissions p
WHERE r.name = 'mlo'
  AND p.resource = 'mlo'
  AND p.action IN ('view_dashboard', 'view_visits', 'create_visit', 'edit_visit', 'delete_visit', 'view_targets')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign all MLO permissions to mlo_manager role
INSERT INTO public.rbac_role_permissions (role_id, permission_id, effect)
SELECT r.id, p.id, 'allow'
FROM public.rbac_roles r, public.rbac_permissions p
WHERE r.name = 'mlo_manager'
  AND p.resource = 'mlo'
ON CONFLICT (role_id, permission_id) DO NOTHING;