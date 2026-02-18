
-- Create a table for pending role/location assignments that get applied on first login
CREATE TABLE public.pending_user_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role_ids UUID[] DEFAULT '{}',
  location_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  applied_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.pending_user_assignments ENABLE ROW LEVEL SECURITY;

-- Only admins can manage pending assignments
CREATE POLICY "Admins can manage pending assignments"
ON public.pending_user_assignments
FOR ALL
TO authenticated
USING (public.is_admin_or_manager());

-- Insert Tara's pending assignment
INSERT INTO public.pending_user_assignments (email, full_name, role_ids, location_ids)
SELECT 
  'tarkins@focusrad.com.au',
  'Tara Arkins',
  ARRAY['27008fcd-a31a-4839-ba1f-cb2e3ace4c5a']::UUID[], -- MLO (marketing) role
  ARRAY(
    SELECT id FROM locations 
    WHERE name ILIKE '%engadine%' OR name ILIKE '%haymarket%'
  );
