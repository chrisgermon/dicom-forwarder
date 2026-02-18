-- Add foreign key constraint to request_comments
ALTER TABLE public.request_comments
  ADD CONSTRAINT request_comments_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;