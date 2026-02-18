-- Fix search_path for get_request_approver function
DROP FUNCTION IF EXISTS get_request_approver(uuid, uuid, uuid);

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;