-- Add assigned_to field to hardware_requests
ALTER TABLE hardware_requests
ADD COLUMN assigned_to uuid REFERENCES auth.users(id);

-- Create request_activity table for tracking all changes and updates
CREATE TABLE request_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  request_type text NOT NULL DEFAULT 'hardware',
  user_id uuid REFERENCES auth.users(id),
  activity_type text NOT NULL,
  old_value text,
  new_value text,
  comment text,
  is_internal boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on request_activity
ALTER TABLE request_activity ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view activity for requests they have access to
CREATE POLICY "Users can view request activity"
ON request_activity
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM hardware_requests
    WHERE hardware_requests.id = request_activity.request_id
    AND (
      hardware_requests.user_id = auth.uid()
      OR hardware_requests.assigned_to = auth.uid()
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'tenant_admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
);

-- Policy: Authenticated users can insert activity
CREATE POLICY "Authenticated users can insert request activity"
ON request_activity
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_request_activity_request_id ON request_activity(request_id);
CREATE INDEX idx_hardware_requests_assigned_to ON hardware_requests(assigned_to);

-- Create trigger to log status changes
CREATE OR REPLACE FUNCTION log_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO request_activity (
      request_id,
      request_type,
      user_id,
      activity_type,
      old_value,
      new_value
    ) VALUES (
      NEW.id,
      'hardware',
      auth.uid(),
      'status_change',
      OLD.status,
      NEW.status
    );
  END IF;
  
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO request_activity (
      request_id,
      request_type,
      user_id,
      activity_type,
      old_value,
      new_value
    ) VALUES (
      NEW.id,
      'hardware',
      auth.uid(),
      'assignment_change',
      OLD.assigned_to::text,
      NEW.assigned_to::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER hardware_requests_activity_trigger
AFTER UPDATE ON hardware_requests
FOR EACH ROW
EXECUTE FUNCTION log_request_status_change();