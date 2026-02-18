-- Fix teams RLS policy to allow managers to create teams
DROP POLICY IF EXISTS "Admins can manage teams" ON public.teams;

CREATE POLICY "Admins and managers can manage teams"
ON public.teams
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'tenant_admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);