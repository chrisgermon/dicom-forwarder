
-- Update RLS policy for newsletter_submissions to include cycle owners
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.newsletter_submissions;

CREATE POLICY "Users can view their own submissions or as cycle owner"
  ON public.newsletter_submissions FOR SELECT
  USING (
    auth.uid() = contributor_id 
    OR has_role(auth.uid(), 'manager') 
    OR has_role(auth.uid(), 'tenant_admin') 
    OR has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM newsletter_cycles nc 
      WHERE nc.id = newsletter_submissions.cycle_id 
      AND nc.owner_id = auth.uid()
    )
  );

-- Update RLS policy for newsletter_cycles to allow owners full management
DROP POLICY IF EXISTS "Managers can manage newsletter cycles" ON public.newsletter_cycles;

CREATE POLICY "Managers and owners can manage newsletter cycles"
  ON public.newsletter_cycles FOR ALL
  USING (
    has_role(auth.uid(), 'manager') 
    OR has_role(auth.uid(), 'tenant_admin') 
    OR has_role(auth.uid(), 'super_admin')
    OR owner_id = auth.uid()
  );

-- Update RLS policy for newsletter_assignments to include cycle owners
DROP POLICY IF EXISTS "Users can view their own assignments" ON public.newsletter_assignments;

CREATE POLICY "Users can view their own assignments or as cycle owner"
  ON public.newsletter_assignments FOR SELECT
  USING (
    auth.uid() = contributor_id 
    OR has_role(auth.uid(), 'manager') 
    OR has_role(auth.uid(), 'tenant_admin') 
    OR has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM newsletter_cycles nc 
      WHERE nc.id = newsletter_assignments.cycle_id 
      AND nc.owner_id = auth.uid()
    )
  );

-- Update managers policy for assignments to include owners
DROP POLICY IF EXISTS "Managers can manage all assignments" ON public.newsletter_assignments;

CREATE POLICY "Managers and owners can manage all assignments"
  ON public.newsletter_assignments FOR ALL
  USING (
    has_role(auth.uid(), 'manager') 
    OR has_role(auth.uid(), 'tenant_admin') 
    OR has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM newsletter_cycles nc 
      WHERE nc.id = newsletter_assignments.cycle_id 
      AND nc.owner_id = auth.uid()
    )
  );

-- Update managers policy for submissions to include owners
DROP POLICY IF EXISTS "Managers can manage all submissions" ON public.newsletter_submissions;

CREATE POLICY "Managers and owners can manage all submissions"
  ON public.newsletter_submissions FOR ALL
  USING (
    has_role(auth.uid(), 'manager') 
    OR has_role(auth.uid(), 'tenant_admin') 
    OR has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM newsletter_cycles nc 
      WHERE nc.id = newsletter_submissions.cycle_id 
      AND nc.owner_id = auth.uid()
    )
  );
