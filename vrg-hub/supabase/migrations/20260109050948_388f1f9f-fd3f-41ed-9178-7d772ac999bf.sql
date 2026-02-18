-- Drop the existing check constraint and add updated one with link_buttons
ALTER TABLE page_modules DROP CONSTRAINT IF EXISTS page_modules_module_type_check;

ALTER TABLE page_modules ADD CONSTRAINT page_modules_module_type_check 
CHECK (module_type IN ('quick_links', 'image_gallery', 'file_browser', 'rich_text', 'link_buttons'));