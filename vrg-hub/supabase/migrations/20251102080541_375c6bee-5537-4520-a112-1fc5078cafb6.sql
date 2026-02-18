-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'application/zip']
)
ON CONFLICT (id) DO NOTHING;

-- Create file_folders table
CREATE TABLE IF NOT EXISTS file_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES file_folders(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- Create file_documents table
CREATE TABLE IF NOT EXISTS file_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  folder_id UUID REFERENCES file_folders(id) ON DELETE CASCADE,
  size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- Create file_shares table for sharing files/folders
CREATE TABLE IF NOT EXISTS file_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES file_documents(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES file_folders(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL,
  shared_with UUID NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT share_target_check CHECK (
    (file_id IS NOT NULL AND folder_id IS NULL) OR
    (file_id IS NULL AND folder_id IS NOT NULL)
  )
);

-- Create file_activity table for tracking file operations
CREATE TABLE IF NOT EXISTS file_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES file_documents(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES file_folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_file_folders_parent_id ON file_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_file_folders_created_by ON file_folders(created_by);
CREATE INDEX IF NOT EXISTS idx_file_documents_folder_id ON file_documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_file_documents_uploaded_by ON file_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_shares_file_id ON file_shares(file_id);
CREATE INDEX IF NOT EXISTS idx_file_shares_folder_id ON file_shares(folder_id);
CREATE INDEX IF NOT EXISTS idx_file_shares_shared_with ON file_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_file_activity_file_id ON file_activity(file_id);
CREATE INDEX IF NOT EXISTS idx_file_activity_folder_id ON file_activity(folder_id);

-- Enable RLS
ALTER TABLE file_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for file_folders
CREATE POLICY "Users can view all active folders"
  ON file_folders FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can create folders"
  ON file_folders FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own folders"
  ON file_folders FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own folders"
  ON file_folders FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for file_documents
CREATE POLICY "Users can view all active documents"
  ON file_documents FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can upload documents"
  ON file_documents FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own documents"
  ON file_documents FOR UPDATE
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own documents"
  ON file_documents FOR DELETE
  USING (auth.uid() = uploaded_by);

-- RLS Policies for file_shares
CREATE POLICY "Users can view shares for their files"
  ON file_shares FOR SELECT
  USING (auth.uid() = shared_by OR auth.uid() = shared_with);

CREATE POLICY "Users can create shares for their files"
  ON file_shares FOR INSERT
  WITH CHECK (auth.uid() = shared_by);

CREATE POLICY "Users can delete their own shares"
  ON file_shares FOR DELETE
  USING (auth.uid() = shared_by);

-- RLS Policies for file_activity
CREATE POLICY "Users can view activity for their files"
  ON file_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity"
  ON file_activity FOR INSERT
  WITH CHECK (true);

-- Storage policies for documents bucket
CREATE POLICY "Users can view their own documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);