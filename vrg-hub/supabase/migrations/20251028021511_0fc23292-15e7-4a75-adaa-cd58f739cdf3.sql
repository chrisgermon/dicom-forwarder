-- Add attachments column to request_comments table
ALTER TABLE public.request_comments 
ADD COLUMN attachments TEXT[] DEFAULT NULL;