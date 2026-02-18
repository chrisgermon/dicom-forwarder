export interface DocumentFile {
  name: string;
  id: string;
  created_at: string;
  metadata: Record<string, any>;
}

export interface FolderItem {
  name: string;
  id: string;
  created_at: string;
}
