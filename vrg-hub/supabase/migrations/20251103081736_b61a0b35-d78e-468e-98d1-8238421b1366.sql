-- Add audit triggers to all user-related tables

-- Audit trigger for profiles table (user profile changes)
DROP TRIGGER IF EXISTS audit_profiles_changes ON public.profiles;
CREATE TRIGGER audit_profiles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

-- Audit trigger for user_roles table (legacy role changes)
DROP TRIGGER IF EXISTS audit_user_roles_changes ON public.user_roles;
CREATE TRIGGER audit_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

-- Audit trigger for rbac_user_roles table (RBAC role assignments)
DROP TRIGGER IF EXISTS audit_rbac_user_roles_changes ON public.rbac_user_roles;
CREATE TRIGGER audit_rbac_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.rbac_user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

-- Audit trigger for rbac_user_permissions table (user permission overrides)
DROP TRIGGER IF EXISTS audit_rbac_user_permissions_changes ON public.rbac_user_permissions;
CREATE TRIGGER audit_rbac_user_permissions_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.rbac_user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

-- Audit trigger for user_invites table (user invitation tracking)
DROP TRIGGER IF EXISTS audit_user_invites_changes ON public.user_invites;
CREATE TRIGGER audit_user_invites_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_invites
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

-- Audit trigger for rbac_roles table (role configuration changes)
DROP TRIGGER IF EXISTS audit_rbac_roles_changes ON public.rbac_roles;
CREATE TRIGGER audit_rbac_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.rbac_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

-- Audit trigger for rbac_role_permissions table (role permission assignments)
DROP TRIGGER IF EXISTS audit_rbac_role_permissions_changes ON public.rbac_role_permissions;
CREATE TRIGGER audit_rbac_role_permissions_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.rbac_role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

-- Audit trigger for rbac_permissions table (permission definition changes)
DROP TRIGGER IF EXISTS audit_rbac_permissions_changes ON public.rbac_permissions;
CREATE TRIGGER audit_rbac_permissions_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.rbac_permissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();