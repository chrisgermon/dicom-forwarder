-- Drop the existing INSERT policy that only checks hardware_requests
DROP POLICY IF EXISTS "Users can create comments on requests they can access" ON request_comments;

-- Create new INSERT policy that checks both tickets and hardware_requests
CREATE POLICY "Users can create comments on requests they can access" ON request_comments
FOR INSERT
TO public
WITH CHECK (
  -- Check if user owns/can access the ticket
  EXISTS (
    SELECT 1
    FROM tickets
    WHERE tickets.id = request_comments.request_id
    AND (
      tickets.user_id = auth.uid()
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'tenant_admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR tickets.assigned_to = auth.uid()
    )
  )
  OR
  -- Check if user owns/can access the hardware_request
  EXISTS (
    SELECT 1
    FROM hardware_requests
    WHERE hardware_requests.id = request_comments.request_id
    AND (
      hardware_requests.user_id = auth.uid()
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'tenant_admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
);

-- Also update the SELECT policy to check both tables
DROP POLICY IF EXISTS "Users can view comments on their requests" ON request_comments;

CREATE POLICY "Users can view comments on their requests" ON request_comments
FOR SELECT
TO public
USING (
  -- Check if user owns/can access the ticket
  EXISTS (
    SELECT 1
    FROM tickets
    WHERE tickets.id = request_comments.request_id
    AND (
      tickets.user_id = auth.uid()
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'tenant_admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR tickets.assigned_to = auth.uid()
    )
  )
  OR
  -- Check if user owns/can access the hardware_request
  EXISTS (
    SELECT 1
    FROM hardware_requests
    WHERE hardware_requests.id = request_comments.request_id
    AND (
      hardware_requests.user_id = auth.uid()
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'tenant_admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
);