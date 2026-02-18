-- Fix request_comments table - make comment nullable and set default from comment_text
ALTER TABLE public.request_comments 
ALTER COLUMN comment DROP NOT NULL;

-- Update any existing records to copy comment_text to comment if comment is null
UPDATE public.request_comments 
SET comment = comment_text 
WHERE comment IS NULL AND comment_text IS NOT NULL;

-- Add a trigger to automatically set comment from comment_text for backwards compatibility
CREATE OR REPLACE FUNCTION sync_comment_text()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.comment_text IS NOT NULL AND NEW.comment IS NULL THEN
    NEW.comment := NEW.comment_text;
  END IF;
  IF NEW.comment IS NOT NULL AND NEW.comment_text IS NULL THEN
    NEW.comment_text := NEW.comment;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_comment_text_trigger
BEFORE INSERT OR UPDATE ON public.request_comments
FOR EACH ROW
EXECUTE FUNCTION sync_comment_text();