-- Fix infinite recursion in team_members RLS policies by dropping and recreating

-- Drop all existing policies on team_members
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'team_members' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON team_members';
    END LOOP;
END $$;

-- Drop all existing policies on teams
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'teams' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON teams';
    END LOOP;
END $$;

-- Create simple, non-recursive policies for teams
CREATE POLICY "Everyone can view teams"
ON teams
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage teams"
ON teams
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'tenant_admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

-- Create simple, non-recursive policies for team_members
CREATE POLICY "Everyone can view team members"
ON team_members
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage team members"
ON team_members
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'tenant_admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);