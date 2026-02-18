-- Drop the existing restrictive SELECT policy on hardware_requests
DROP POLICY IF EXISTS "Users can view their own requests" ON hardware_requests;

-- Create separate, clear policies for different user types
-- Super admins and tenant admins can view ALL requests
CREATE POLICY "Admins can view all hardware requests"
ON hardware_requests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'tenant_admin'::app_role)
);

-- Managers can view ALL requests
CREATE POLICY "Managers can view all hardware requests"  
ON hardware_requests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role)
);

-- Users can view their own requests
CREATE POLICY "Users can view their own hardware requests"
ON hardware_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Apply same fix to marketing_requests
DROP POLICY IF EXISTS "Users can view their own marketing requests" ON marketing_requests;

CREATE POLICY "Admins can view all marketing requests"
ON marketing_requests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'tenant_admin'::app_role) OR
  has_role(auth.uid(), 'marketing_manager'::app_role)
);

CREATE POLICY "Users can view their own marketing requests"
ON marketing_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Apply same fix to toner_requests  
DROP POLICY IF EXISTS "Users can view their own toner requests" ON toner_requests;

CREATE POLICY "Admins can view all toner requests"
ON toner_requests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'tenant_admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Users can view their own toner requests"
ON toner_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);