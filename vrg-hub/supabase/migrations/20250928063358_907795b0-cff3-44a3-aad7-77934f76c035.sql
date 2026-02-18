-- Create a SECURITY DEFINER helper to avoid recursive RLS lookups
CREATE OR REPLACE FUNCTION public.has_global_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Update policies to use the helper instead of self-referencing subqueries
-- Companies
DROP POLICY IF EXISTS "Super admins can view all companies" ON public.companies;
CREATE POLICY "Super admins can view all companies"
ON public.companies
FOR SELECT
USING (public.has_global_role(auth.uid(), 'super_admin'));

-- Profiles
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_global_role(auth.uid(), 'super_admin'));

-- Company domains
DROP POLICY IF EXISTS "Super admins can manage all domains" ON public.company_domains;
CREATE POLICY "Super admins can manage all domains"
ON public.company_domains
FOR ALL
USING (public.has_global_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_global_role(auth.uid(), 'super_admin'));

-- User roles
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_global_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_global_role(auth.uid(), 'super_admin'));
