-- Enable realtime on menu configuration tables so sidebar reflects latest edits

-- Ensure full row data is available for updates/deletes
ALTER TABLE public.menu_configurations REPLICA IDENTITY FULL;
ALTER TABLE public.menu_headings REPLICA IDENTITY FULL;

-- Add tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_configurations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_headings;