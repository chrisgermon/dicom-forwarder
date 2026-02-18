-- Fix RLS policies for request_comments to allow users to add comments
DROP POLICY IF EXISTS "Users can insert their own comments" ON public.request_comments;
DROP POLICY IF EXISTS "Users can view comments on their requests" ON public.request_comments;
DROP POLICY IF EXISTS "Managers can view all comments" ON public.request_comments;

-- Allow users to insert comments on requests they're involved with
CREATE POLICY "Users can insert comments on requests"
  ON public.request_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- Allow users to view comments on their own requests
CREATE POLICY "Users can view comments on their requests"
  ON public.request_comments
  FOR SELECT
  USING (
    -- User created the comment
    user_id = auth.uid()
    OR
    -- User is involved in the request (created it or assigned to it)
    request_id IN (
      SELECT id FROM public.hardware_requests WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.marketing_requests WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.user_account_requests WHERE requested_by = auth.uid()
      UNION
      SELECT id FROM public.department_requests WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.hardware_requests WHERE admin_id = auth.uid() OR manager_id = auth.uid()
      UNION
      SELECT id FROM public.marketing_requests WHERE admin_id = auth.uid() OR manager_id = auth.uid()
      UNION
      SELECT id FROM public.user_account_requests WHERE admin_id = auth.uid()
      UNION
      SELECT id FROM public.department_requests WHERE assigned_to = auth.uid()
    )
  );

-- Managers and admins can see all comments
CREATE POLICY "Managers can view and manage all comments"
  ON public.request_comments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND (
          EXISTS (SELECT 1 FROM public.platform_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
          OR EXISTS (
            SELECT 1 FROM public.company_memberships cm
            JOIN public.membership_roles mr ON mr.membership_id = cm.id
            WHERE cm.user_id = auth.uid()
              AND mr.role IN ('company_admin', 'company_owner', 'approver')
          )
        )
    )
  );