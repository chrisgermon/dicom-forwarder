-- Update RLS policies for modalities to allow all authenticated users to view
DROP POLICY IF EXISTS "Users with permission can read modalities" ON modalities;

CREATE POLICY "All authenticated users can view modalities"
ON modalities
FOR SELECT
TO authenticated
USING (true);

-- Update RLS policies for clinics to allow all authenticated users to view
DROP POLICY IF EXISTS "Users with permission can read clinics" ON clinics;

CREATE POLICY "All authenticated users can view clinics"
ON clinics
FOR SELECT
TO authenticated
USING (true);

-- Update RLS policies for dicom_servers to allow all authenticated users to view
DROP POLICY IF EXISTS "Users with permission can read servers" ON dicom_servers;

CREATE POLICY "All authenticated users can view dicom_servers"
ON dicom_servers
FOR SELECT
TO authenticated
USING (true);