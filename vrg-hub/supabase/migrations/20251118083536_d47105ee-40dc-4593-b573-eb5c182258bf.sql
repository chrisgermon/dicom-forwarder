-- Phase 1: Fix RLS UPDATE policy to allow edits before deadline

-- Create a helper function to check if a cycle's deadline has passed
CREATE OR REPLACE FUNCTION public.is_cycle_deadline_passed(p_cycle_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM newsletter_cycles
    WHERE id = p_cycle_id
      AND due_date < NOW()
  );
$$;

-- Drop the existing restrictive update policy
DROP POLICY IF EXISTS "Contributors can update their draft submissions" ON newsletter_submissions;

-- Create new update policy that allows edits before deadline
CREATE POLICY "Contributors can update their submissions before deadline" 
ON newsletter_submissions 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() = contributor_id 
  AND NOT public.is_cycle_deadline_passed(cycle_id)
)
WITH CHECK (
  auth.uid() = contributor_id 
  AND NOT public.is_cycle_deadline_passed(cycle_id)
);