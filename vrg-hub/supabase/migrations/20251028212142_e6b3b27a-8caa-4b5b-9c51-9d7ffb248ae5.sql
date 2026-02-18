-- Add assigned_user_ids column to request_categories
ALTER TABLE request_categories
ADD COLUMN IF NOT EXISTS assigned_user_ids UUID[] DEFAULT '{}';

-- Add a comment explaining the column
COMMENT ON COLUMN request_categories.assigned_user_ids IS 'Array of user IDs who should receive notifications for requests in this category';

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_request_categories_assigned_users ON request_categories USING GIN(assigned_user_ids);