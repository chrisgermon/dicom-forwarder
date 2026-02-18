import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface FileProgress {
  name: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

interface FileUploadProgressProps {
  open: boolean;
  files: FileProgress[];
}

export function FileUploadProgress({ open, files }: FileUploadProgressProps) {
  const allComplete = files.every(f => f.status === 'success' || f.status === 'error');
  const totalProgress = files.length > 0 
    ? Math.round(files.reduce((acc, f) => acc + f.progress, 0) / files.length)
    : 0;

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {allComplete ? 'Upload Complete' : 'Uploading Files'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Overall progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Overall Progress</span>
              <span className="text-muted-foreground">{totalProgress}%</span>
            </div>
            <Progress value={totalProgress} className="h-2" />
          </div>

          {/* Individual file progress */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {files.map((file, index) => (
              <div key={index} className="space-y-1 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  {file.status === 'uploading' && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {file.status === 'success' && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  {file.status === 'error' && (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  
                  <span className="text-sm font-medium truncate flex-1">
                    {file.name}
                  </span>
                  
                  <span className="text-xs text-muted-foreground">
                    {file.progress}%
                  </span>
                </div>
                
                {file.status === 'uploading' && (
                  <Progress value={file.progress} className="h-1" />
                )}
                
                {file.status === 'error' && file.error && (
                  <p className="text-xs text-destructive mt-1">{file.error}</p>
                )}
              </div>
            ))}
          </div>

          {allComplete && (
            <p className="text-sm text-muted-foreground text-center">
              {files.every(f => f.status === 'success') 
                ? 'All files uploaded successfully'
                : 'Upload completed with some errors'}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
