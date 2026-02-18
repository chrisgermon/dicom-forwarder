-- Create a separate table for global menu headings
CREATE TABLE IF NOT EXISTS public.menu_headings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  heading_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.menu_headings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read headings
CREATE POLICY "Authenticated users can view menu headings"
  ON public.menu_headings
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify headings
CREATE POLICY "Admins can manage menu headings"
  ON public.menu_headings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('tenant_admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('tenant_admin', 'super_admin')
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_menu_headings_updated_at
  BEFORE UPDATE ON public.menu_headings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.menu_headings IS 'Global menu headings that appear for all user roles';