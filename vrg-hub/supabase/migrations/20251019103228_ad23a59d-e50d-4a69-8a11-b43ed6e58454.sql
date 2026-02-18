-- Ensure RLS is enabled and admins can read synced Office 365 users
ALTER TABLE public.synced_office365_users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'synced_office365_users' AND policyname = 'Admins can view synced users'
  ) THEN
    DROP POLICY "Admins can view synced users" ON public.synced_office365_users;
  END IF;
END$$;

CREATE POLICY "Admins can view synced users"
ON public.synced_office365_users
FOR SELECT
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);
