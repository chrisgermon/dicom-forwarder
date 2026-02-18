import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileDropzone, FileList } from '@/components/ui/file-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface UploadFilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string | null;
  onSuccess: () => void;
}

export function UploadFilesDialog({
  open,
  onOpenChange,
  folderId,
  onSuccess,
}: UploadFilesDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const totalFiles = files.length;
      let completed = 0;

      for (const file of files) {
        // Upload to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Create metadata record
        const { error: metadataError } = await supabase.from('file_documents').insert({
          name: file.name,
          storage_path: fileName,
          folder_id: folderId,
          size: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
        });

        if (metadataError) throw metadataError;

        completed++;
        setProgress((completed / totalFiles) * 100);
      }

      toast({
        title: 'Upload complete',
        description: `Successfully uploaded ${files.length} file(s)`,
      });

      setFiles([]);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message,
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!uploading && (
            <FileDropzone
              onFilesSelected={(newFiles) => setFiles([...files, ...newFiles])}
              multiple
              maxSize={100}
              label="Select files to upload"
              description="You can upload multiple files at once (max 100MB each)"
            />
          )}

          {files.length > 0 && !uploading && (
            <FileList files={files} onRemove={handleRemoveFile} />
          )}

          {uploading && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Uploading files...</p>
              <Progress value={progress} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={files.length === 0 || uploading}>
            {uploading && <Loader2 className="size-4 mr-2 animate-spin" />}
            Upload {files.length > 0 && `(${files.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
