-- Add request_number column with auto-incrementing sequence
CREATE SEQUENCE IF NOT EXISTS hardware_requests_number_seq START WITH 1;

ALTER TABLE hardware_requests 
ADD COLUMN IF NOT EXISTS request_number INTEGER DEFAULT nextval('hardware_requests_number_seq');

-- Create unique index on request_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_hardware_requests_request_number ON hardware_requests(request_number);

-- Update existing records to have sequential numbers (if any exist)
WITH numbered_requests AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_number
  FROM hardware_requests
  WHERE request_number IS NULL
)
UPDATE hardware_requests
SET request_number = numbered_requests.new_number
FROM numbered_requests
WHERE hardware_requests.id = numbered_requests.id;

-- Reset sequence to continue from the highest existing number
SELECT setval('hardware_requests_number_seq', COALESCE((SELECT MAX(request_number) FROM hardware_requests), 0) + 1, false);