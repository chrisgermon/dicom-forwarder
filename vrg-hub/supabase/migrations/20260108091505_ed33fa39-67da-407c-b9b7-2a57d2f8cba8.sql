-- Drop the existing constraint and add updated one with file_browser type
ALTER TABLE public.page_modules DROP CONSTRAINT page_modules_module_type_check;

ALTER TABLE public.page_modules ADD CONSTRAINT page_modules_module_type_check 
CHECK (module_type = ANY (ARRAY['quick_links'::text, 'image_gallery'::text, 'sharepoint_links'::text, 'rich_text'::text, 'file_browser'::text]));