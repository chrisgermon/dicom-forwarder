import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderPlus, Upload, Search, Grid, List } from 'lucide-react';
import { FileBrowser } from '@/components/file-manager/FileBrowser';
import { CreateFolderDialog } from '@/components/file-manager/CreateFolderDialog';
import { UploadFilesDialog } from '@/components/file-manager/UploadFilesDialog';
import { Breadcrumbs } from '@/components/file-manager/Breadcrumbs';
import { useFileManager } from '@/hooks/useFileManager';

export default function FileManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const {
    currentFolderId,
    folders,
    files,
    breadcrumbs,
    loading,
    navigateToFolder,
    refreshFiles,
  } = useFileManager();

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFolders = folders.filter((folder) =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">File Manager</h1>
          <p className="text-muted-foreground mt-1">
            Manage your documents and files
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateFolder(true)} variant="outline">
            <FolderPlus className="size-4 mr-2" />
            New Folder
          </Button>
          <Button onClick={() => setShowUpload(true)}>
            <Upload className="size-4 mr-2" />
            Upload Files
          </Button>
        </div>
      </div>

      {/* Breadcrumbs and Search */}
      <div className="flex items-center gap-4">
        <Breadcrumbs
          items={breadcrumbs}
          onNavigate={navigateToFolder}
        />
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-7 w-7 p-0"
            >
              <Grid className="size-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-7 w-7 p-0"
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* File Browser */}
      <FileBrowser
        folders={filteredFolders}
        files={filteredFiles}
        viewMode={viewMode}
        loading={loading}
        onFolderClick={navigateToFolder}
        onRefresh={refreshFiles}
      />

      {/* Dialogs */}
      <CreateFolderDialog
        open={showCreateFolder}
        onOpenChange={setShowCreateFolder}
        parentFolderId={currentFolderId}
        onSuccess={refreshFiles}
      />

      <UploadFilesDialog
        open={showUpload}
        onOpenChange={setShowUpload}
        folderId={currentFolderId}
        onSuccess={refreshFiles}
      />
    </div>
  );
}
