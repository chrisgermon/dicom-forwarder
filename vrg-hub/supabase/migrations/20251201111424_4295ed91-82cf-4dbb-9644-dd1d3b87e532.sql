-- Table for tracking user's favorite SharePoint items
CREATE TABLE IF NOT EXISTS public.sharepoint_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('file', 'folder')),
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_path TEXT NOT NULL,
  item_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- Table for tracking recently accessed SharePoint items
CREATE TABLE IF NOT EXISTS public.sharepoint_recent_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('file', 'folder')),
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_path TEXT NOT NULL,
  item_url TEXT,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- Enable RLS
ALTER TABLE public.sharepoint_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharepoint_recent_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sharepoint_favorites
CREATE POLICY "Users can view their own favorites"
  ON public.sharepoint_favorites
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorites"
  ON public.sharepoint_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON public.sharepoint_favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for sharepoint_recent_items
CREATE POLICY "Users can view their own recent items"
  ON public.sharepoint_recent_items
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own recent items"
  ON public.sharepoint_recent_items
  FOR ALL
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_sharepoint_favorites_user_id ON public.sharepoint_favorites(user_id);
CREATE INDEX idx_sharepoint_recent_items_user_id ON public.sharepoint_recent_items(user_id);
CREATE INDEX idx_sharepoint_recent_items_accessed ON public.sharepoint_recent_items(user_id, last_accessed_at DESC);