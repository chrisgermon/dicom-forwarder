-- Add user_id to office365_connections to support user-level auth
ALTER TABLE office365_connections
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add index for efficient user lookups
CREATE INDEX idx_office365_connections_user_id ON office365_connections(user_id);

-- Update RLS policies to allow users to manage their own connections
DROP POLICY IF EXISTS "Tenant admins can manage their connection" ON office365_connections;
DROP POLICY IF EXISTS "Tenant admins can view their connection" ON office365_connections;

-- Users can view their own connection
CREATE POLICY "Users can view their own connection"
ON office365_connections
FOR SELECT
USING (
  user_id = auth.uid() OR 
  (user_id IS NULL AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role))
);

-- Users can manage their own connection
CREATE POLICY "Users can manage their own connection"
ON office365_connections
FOR ALL
USING (
  user_id = auth.uid() OR 
  (user_id IS NULL AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role))
)
WITH CHECK (
  user_id = auth.uid() OR 
  (user_id IS NULL AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role))
);

-- Comment to explain the schema
COMMENT ON COLUMN office365_connections.user_id IS 'If set, this is a user-level connection. If NULL, this is a company-level connection for admin use.';