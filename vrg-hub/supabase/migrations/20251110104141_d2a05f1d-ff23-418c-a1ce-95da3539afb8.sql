
-- Allow contributors to create their own assignments for departments they're assigned to
CREATE POLICY "Contributors can create their own assignments"
ON public.newsletter_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = contributor_id
  AND EXISTS (
    SELECT 1 FROM public.department_assignments da
    WHERE da.department = newsletter_assignments.department
    AND auth.uid() = ANY(da.assignee_ids)
  )
);

-- Allow contributors to update their own assignment status
CREATE POLICY "Contributors can update their own assignment status"
ON public.newsletter_assignments
FOR UPDATE
TO authenticated
USING (auth.uid() = contributor_id)
WITH CHECK (auth.uid() = contributor_id);
