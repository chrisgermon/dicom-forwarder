-- Add approval fields to tickets table
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'none' CHECK (approval_status IN ('none', 'pending', 'approved', 'declined')),
ADD COLUMN IF NOT EXISTS approver_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approval_notes text,
ADD COLUMN IF NOT EXISTS declined_reason text;

-- Update hardware request form template to require approval
UPDATE form_templates
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{require_approval}',
  'true'::jsonb
)
WHERE name = 'Hardware Request';

-- Create function to determine approver based on brand/location
CREATE OR REPLACE FUNCTION get_request_approver(
  p_brand_id uuid,
  p_location_id uuid,
  p_request_type_id uuid
) RETURNS uuid AS $$
DECLARE
  v_approver_id uuid;
BEGIN
  -- First try to find manager role users for the brand/location
  SELECT p.id INTO v_approver_id
  FROM profiles p
  WHERE p.role IN ('manager', 'tenant_admin', 'super_admin')
    AND (p.brand_id = p_brand_id OR p.brand_id IS NULL)
    AND (p.location_id = p_location_id OR p.location_id IS NULL)
  ORDER BY 
    CASE p.role
      WHEN 'manager' THEN 1
      WHEN 'tenant_admin' THEN 2
      WHEN 'super_admin' THEN 3
    END
  LIMIT 1;
  
  -- If no manager found, get any admin
  IF v_approver_id IS NULL THEN
    SELECT p.id INTO v_approver_id
    FROM profiles p
    WHERE p.role IN ('tenant_admin', 'super_admin')
    LIMIT 1;
  END IF;
  
  RETURN v_approver_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;