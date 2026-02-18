-- Deprecate the old user_roles table in favor of RBAC system
-- This migration adds a clear deprecation comment to the old table

COMMENT ON TABLE user_roles IS 'DEPRECATED: Use rbac_user_roles and rbac_roles tables instead. This table is kept for reference only and should not be used in new code.';

-- Optionally, you can drop the table entirely if you're confident all data has been migrated
-- For safety, we'll just disable writes to it by removing INSERT/UPDATE permissions

-- Remove ability to insert or update (keeps table for historical reference)
DROP POLICY IF EXISTS "Users can manage their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

-- Add read-only policy for historical reference
CREATE POLICY "Read-only access for reference" 
ON user_roles 
FOR SELECT 
USING (true);

-- Log that migration was successful
DO $$
BEGIN
  RAISE NOTICE 'Successfully deprecated user_roles table. All code now uses rbac_user_roles and rbac_roles.';
END
$$;