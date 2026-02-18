import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, ExternalLink, X, Maximize2, Minimize2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface FilePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    id: string;
    name: string;
    webUrl: string;
    downloadUrl?: string;
    fileType: string;
  } | null;
}

type PreviewType = 'office' | 'pdf' | 'image' | 'video' | 'audio' | 'text' | 'unknown';

interface PreviewData {
  previewType: PreviewType;
  previewUrl?: string;
  downloadUrl?: string;
  webUrl?: string;
  editUrl?: string;
  canPreview: boolean;
  canEdit?: boolean;
  useDownloadUrl?: boolean;
  mimeType?: string;
}

function getPreviewTypeFromExtension(filename: string): PreviewType {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'].includes(ext)) {
    return 'office';
  }
  if (ext === 'pdf') {
    return 'pdf';
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
    return 'image';
  }
  if (['mp4', 'mov', 'webm'].includes(ext)) {
    return 'video';
  }
  if (['mp3', 'wav', 'ogg'].includes(ext)) {
    return 'audio';
  }
  if (['txt', 'md', 'json', 'xml', 'csv', 'log'].includes(ext)) {
    return 'text';
  }

  return 'unknown';
}

export function FilePreviewModal({ open, onOpenChange, file }: FilePreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !file) {
      setPreviewData(null);
      setTextContent(null);
      setLoading(true);
      return;
    }

    const fetchPreview = async () => {
      setLoading(true);
      setTextContent(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error('Please log in to preview files');
          onOpenChange(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke('sharepoint-get-preview', {
          body: { item_id: file.id, filename: file.name },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (error) {
          console.error('Preview error:', error);
          // Fallback to download URL if available
          const type = getPreviewTypeFromExtension(file.name);
          setPreviewData({
            previewType: type,
            downloadUrl: file.downloadUrl,
            webUrl: file.webUrl,
            canPreview: type === 'image' || type === 'video' || type === 'audio',
            useDownloadUrl: true,
          });
        } else {
          setPreviewData(data as PreviewData);

          // For text files, fetch content
          if (data?.previewType === 'text' && data?.downloadUrl) {
            try {
              const response = await fetch(data.downloadUrl);
              if (response.ok) {
                const text = await response.text();
                setTextContent(text.slice(0, 100000)); // Limit to 100KB
              }
            } catch (e) {
              console.error('Failed to fetch text content:', e);
            }
          }
        }
      } catch (error) {
        console.error('Preview fetch error:', error);
        toast.error('Failed to load preview');
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [open, file]);

  if (!file) return null;

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!previewData?.canPreview) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <p className="text-muted-foreground">Preview not available for this file type</p>
          <div className="flex gap-2">
            <Button onClick={() => window.open(file.webUrl, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in SharePoint
            </Button>
            {file.downloadUrl && (
              <Button variant="outline" onClick={() => window.open(file.downloadUrl, '_blank')}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </div>
      );
    }

    const url = previewData.useDownloadUrl
      ? (previewData.downloadUrl || file.downloadUrl)
      : previewData.previewUrl;

    switch (previewData.previewType) {
      case 'office':
        // Office Online preview - use iframe
        return (
          <iframe
            src={url}
            className="w-full h-[70vh] border-0 rounded"
            title={`Preview: ${file.name}`}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        );

      case 'pdf':
        // PDF preview
        return (
          <iframe
            src={url}
            className="w-full h-[70vh] border-0 rounded"
            title={`Preview: ${file.name}`}
          />
        );

      case 'image':
        return (
          <div className="flex items-center justify-center h-[70vh] bg-muted/20 rounded">
            <img
              src={url}
              alt={file.name}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        );

      case 'video':
        return (
          <div className="flex items-center justify-center h-[70vh] bg-black rounded">
            <video
              src={url}
              controls
              className="max-w-full max-h-full"
              autoPlay={false}
            >
              Your browser does not support video playback.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="flex flex-col items-center justify-center h-[40vh] gap-4">
            <div className="text-6xl">🎵</div>
            <p className="text-lg font-medium">{file.name}</p>
            <audio src={url} controls className="w-full max-w-md">
              Your browser does not support audio playback.
            </audio>
          </div>
        );

      case 'text':
        return (
          <div className="h-[70vh] overflow-auto bg-muted/20 rounded p-4">
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {textContent || 'Loading content...'}
            </pre>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <p className="text-muted-foreground">Preview not available</p>
            <Button onClick={() => window.open(file.webUrl, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in SharePoint
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${fullscreen ? 'max-w-[100vw] h-[100vh] m-0 rounded-none' : 'max-w-5xl'} p-0 [&>button]:hidden`}
      >
        <DialogHeader className="p-4 pb-2 flex flex-row items-center justify-between border-b">
          <DialogTitle className="truncate pr-4 flex-1">{file.name}</DialogTitle>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFullscreen(!fullscreen)}
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            {previewData?.canEdit && previewData?.editUrl && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(previewData.editUrl, '_blank')}
                title="Edit in Office"
                className="text-primary hover:text-primary"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(file.webUrl, '_blank')}
              title="Open in SharePoint"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            {file.downloadUrl && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(file.downloadUrl, '_blank')}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="p-4 pt-0">{renderPreview()}</div>
      </DialogContent>
    </Dialog>
  );
}
