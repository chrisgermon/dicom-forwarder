import React, { useCallback, useState } from 'react';
import { Upload, X, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  className?: string;
  label?: string;
  description?: string;
  allowFolders?: boolean;
}

export function FileDropzone({
  onFilesSelected,
  accept,
  multiple = false,
  maxSize = 100,
  className,
  label,
  description,
  allowFolders = false,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter((file) => {
        const sizeMB = file.size / 1024 / 1024;
        return sizeMB <= maxSize;
      });

      if (validFiles.length > 0) {
        onFilesSelected(multiple ? validFiles : [validFiles[0]]);
      }
    },
    [maxSize, multiple, onFilesSelected]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const validFiles = files.filter((file) => {
        const sizeMB = file.size / 1024 / 1024;
        return sizeMB <= maxSize;
      });

      if (validFiles.length > 0) {
        onFilesSelected(multiple ? validFiles : [validFiles[0]]);
      }
      
      // Reset input
      e.target.value = '';
    },
    [maxSize, multiple, onFilesSelected]
  );

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block">
          {label}
        </label>
      )}
      {description && (
        <p className="text-sm text-muted-foreground mb-2">{description}</p>
      )}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer hover:border-primary/50',
          isDragging ? 'border-primary bg-primary/5' : 'border-border',
          className
        )}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          {...(allowFolders ? { webkitdirectory: '', directory: '' } as any : {})}
        />
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <Upload className={cn('size-8', isDragging ? 'text-primary' : 'text-muted-foreground')} />
          <div>
            <p className="text-sm font-medium">
              {allowFolders ? 'Select a folder to upload' : 'Drop files here or click to browse'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Max {maxSize}MB per file
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FileListProps {
  files: File[];
  onRemove: (index: number) => void;
  className?: string;
}

export function FileList({ files, onRemove, className }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {files.map((file, index) => (
        <div
          key={`${file.name}-${index}`}
          className="flex items-center gap-2 rounded-md border p-2 text-sm"
        >
          <File className="size-4 text-muted-foreground flex-shrink-0" />
          <span className="flex-1 truncate">{file.name}</span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {(file.size / 1024).toFixed(1)} KB
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="h-6 w-6 p-0"
          >
            <X className="size-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
