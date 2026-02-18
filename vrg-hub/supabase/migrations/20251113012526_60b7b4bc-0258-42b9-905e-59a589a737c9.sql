-- Remove all write policies from deprecated user_roles table
-- Keep only SELECT policies for historical reference

DROP POLICY IF EXISTS "Admins can insert user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON user_roles;

-- Keep SELECT policies for reference
-- "Read-only access for reference" policy already exists from previous migration
-- "Admins can view all user roles" policy can stay
-- "Users can read own roles" policy can stay

COMMENT ON TABLE user_roles IS 'DEPRECATED: Use rbac_user_roles and rbac_roles tables instead. This table is READ-ONLY and kept for historical reference only.';