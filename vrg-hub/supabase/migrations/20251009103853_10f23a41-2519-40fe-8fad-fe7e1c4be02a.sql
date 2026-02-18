-- Fix search_path for sync_comment_text function
DROP FUNCTION IF EXISTS sync_comment_text() CASCADE;

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
$$ LANGUAGE plpgsql 
SET search_path = public;

CREATE TRIGGER sync_comment_text_trigger
BEFORE INSERT OR UPDATE ON public.request_comments
FOR EACH ROW
EXECUTE FUNCTION sync_comment_text();