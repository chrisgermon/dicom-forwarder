-- Fix recursive RLS policy on request_handler_group_members

-- Drop the recursive policy that self-references request_handler_group_members
DROP POLICY IF EXISTS "Users can view members of groups they belong to" ON public.request_handler_group_members;

-- (Optional cleanup) drop duplicate own-membership policy name if present
DROP POLICY IF EXISTS "Users can view their own group memberships" ON public.request_handler_group_members;

-- Recreate a non-recursive policy using SECURITY DEFINER function
-- This allows a user to see all members in a group if they are a member of that group
CREATE POLICY "Users can view members of groups they are in"
ON public.request_handler_group_members
FOR SELECT
TO authenticated
USING (public.is_in_handler_group(auth.uid(), request_handler_group_members.group_id));

-- Keep a simple own-memberships policy (non-recursive)
-- Note: applies to authenticated users only
DROP POLICY IF EXISTS "Users can view own memberships" ON public.request_handler_group_members;
CREATE POLICY "Users can view own memberships"
ON public.request_handler_group_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());