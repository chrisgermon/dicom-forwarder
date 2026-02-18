-- Make permission_key nullable for backward compatibility
ALTER TABLE public.role_permissions 
  ALTER COLUMN permission_key DROP NOT NULL;

-- Make permission nullable for user_permissions
ALTER TABLE public.user_permissions 
  ALTER COLUMN permission DROP NOT NULL;

-- Migrate existing role_permissions to use feature_id
UPDATE public.role_permissions rp
SET feature_id = f.id
FROM public.features f
WHERE rp.permission_key = f.feature_key
  AND rp.feature_id IS NULL;

-- Migrate existing user_permissions to use feature_id  
UPDATE public.user_permissions up
SET feature_id = f.id
FROM public.features f
WHERE up.permission::text = f.feature_key
  AND up.feature_id IS NULL;