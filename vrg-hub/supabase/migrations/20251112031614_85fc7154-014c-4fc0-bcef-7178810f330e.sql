-- Update RLS policies for quick_links to allow all users to view but only super_admins to manage

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view all quick links" ON public.quick_links;
DROP POLICY IF EXISTS "Users can manage their own quick links" ON public.quick_links;
DROP POLICY IF EXISTS "Super admins can manage quick links" ON public.quick_links;

-- Enable RLS
ALTER TABLE public.quick_links ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view quick links
CREATE POLICY "All users can view quick links"
ON public.quick_links
FOR SELECT
TO authenticated
USING (true);

-- Allow super_admins to insert quick links
CREATE POLICY "Super admins can insert quick links"
ON public.quick_links
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Allow super_admins to update quick links
CREATE POLICY "Super admins can update quick links"
ON public.quick_links
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Allow super_admins to delete quick links
CREATE POLICY "Super admins can delete quick links"
ON public.quick_links
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);