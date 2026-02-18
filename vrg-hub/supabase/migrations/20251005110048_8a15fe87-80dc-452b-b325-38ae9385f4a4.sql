-- Add user offboarding permission to permission_type enum
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'manage_user_offboarding';