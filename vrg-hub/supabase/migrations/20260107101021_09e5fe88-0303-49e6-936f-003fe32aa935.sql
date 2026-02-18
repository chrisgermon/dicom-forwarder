-- Drop existing problematic policies on request_handler_group_members
DROP POLICY IF EXISTS "Admins can manage group members" ON public.request_handler_group_members;
DROP POLICY IF EXISTS "Users can view group members" ON public.request_handler_group_members;
DROP POLICY IF EXISTS "Members can view their own group memberships" ON public.request_handler_group_members;

-- Create simple, non-recursive policies using the is_admin_or_manager function
CREATE POLICY "Admins can view all group members"
ON public.request_handler_group_members
FOR SELECT
USING (public.is_admin_or_manager());

CREATE POLICY "Admins can insert group members"
ON public.request_handler_group_members
FOR INSERT
WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Admins can update group members"
ON public.request_handler_group_members
FOR UPDATE
USING (public.is_admin_or_manager());

CREATE POLICY "Admins can delete group members"
ON public.request_handler_group_members
FOR DELETE
USING (public.is_admin_or_manager());

-- Allow users to see their own memberships without recursion
CREATE POLICY "Users can view own memberships"
ON public.request_handler_group_members
FOR SELECT
USING (user_id = auth.uid());