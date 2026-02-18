import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import { logger } from '@/lib/logger';

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  created_by: string;
}

interface FileDocument {
  id: string;
  name: string;
  storage_path: string;
  folder_id: string | null;
  size: number;
  mime_type: string;
  created_at: string;
  uploaded_by: string;
  tags: string[];
}

interface Breadcrumb {
  id: string | null;
  name: string;
}

export function useFileManager() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileDocument[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: null, name: 'Home' }]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { logView } = useAuditLog();

  const fetchContents = async (folderId: string | null) => {
    try {
      setLoading(true);

      // Fetch folders - handle null parent_id correctly
      let foldersQuery = supabase
        .from('file_folders')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (folderId === null) {
        foldersQuery = foldersQuery.is('parent_id', null);
      } else {
        foldersQuery = foldersQuery.eq('parent_id', folderId);
      }

      const { data: foldersData, error: foldersError } = await foldersQuery;
      if (foldersError) throw foldersError;

      // Fetch files - handle null folder_id correctly
      let filesQuery = supabase
        .from('file_documents')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (folderId === null) {
        filesQuery = filesQuery.is('folder_id', null);
      } else {
        filesQuery = filesQuery.eq('folder_id', folderId);
      }

      const { data: filesData, error: filesError } = await filesQuery;
      if (filesError) throw filesError;

      setFolders(foldersData || []);
      setFiles(filesData || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading files',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const buildBreadcrumbs = async (folderId: string | null) => {
    if (!folderId) {
      setBreadcrumbs([{ id: null, name: 'Home' }]);
      return;
    }

    try {
      const crumbs: Breadcrumb[] = [];
      let currentId: string | null = folderId;

      // Build chain from current folder to root
      while (currentId) {
        const { data, error } = await supabase
          .from('file_folders')
          .select('id, name, parent_id')
          .eq('id', currentId)
          .eq('is_active', true)
          .single();

        if (error || !data) break;

        crumbs.unshift({ id: data.id, name: data.name });
        currentId = data.parent_id;
      }

      setBreadcrumbs([{ id: null, name: 'Home' }, ...crumbs]);
    } catch (error: any) {
      logger.error('Error building breadcrumbs', error);
    }
  };

  const navigateToFolder = async (folderId: string | null) => {
    setCurrentFolderId(folderId);
    if (folderId) {
      logView('file_folders', folderId);
    }
    await Promise.all([fetchContents(folderId), buildBreadcrumbs(folderId)]);
  };

  const refreshFiles = () => {
    fetchContents(currentFolderId);
  };

  useEffect(() => {
    navigateToFolder(null);
  }, []);

  return {
    currentFolderId,
    folders,
    files,
    breadcrumbs,
    loading,
    navigateToFolder,
    refreshFiles,
  };
}
