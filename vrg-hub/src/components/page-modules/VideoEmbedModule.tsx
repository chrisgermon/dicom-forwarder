import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video } from "lucide-react";
import { VideoEmbedContent } from "./types";

interface VideoEmbedModuleProps {
  content: VideoEmbedContent;
  editing: boolean;
  onChange: (content: VideoEmbedContent) => void;
}

const ASPECT_RATIOS = [
  { value: '16:9', label: '16:9 (Widescreen)' },
  { value: '4:3', label: '4:3 (Standard)' },
  { value: '1:1', label: '1:1 (Square)' },
];

function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  
  // Microsoft Stream / SharePoint
  if (url.includes('sharepoint.com') || url.includes('microsoftstream.com')) {
    return url;
  }
  
  // Direct embed URL
  if (url.includes('embed')) {
    return url;
  }
  
  return null;
}

export function VideoEmbedModule({ content, editing, onChange }: VideoEmbedModuleProps) {
  const embedUrl = getEmbedUrl(content.url);
  
  const aspectClass = {
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    '1:1': 'aspect-square',
  }[content.aspectRatio];

  const renderVideo = () => {
    if (!embedUrl) {
      return (
        <div className={`${aspectClass} bg-muted rounded-lg flex flex-col items-center justify-center text-muted-foreground`}>
          <Video className="h-12 w-12 mb-2" />
          <p className="text-sm">No video URL provided</p>
        </div>
      );
    }

    return (
      <div className={`${aspectClass} w-full overflow-hidden rounded-lg bg-black`}>
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  };

  if (!editing) {
    return (
      <div className="space-y-2">
        {content.title && <h4 className="font-medium">{content.title}</h4>}
        {renderVideo()}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">Video URL</Label>
        <Input
          value={content.url}
          onChange={(e) => onChange({ ...content, url: e.target.value })}
          placeholder="YouTube, Vimeo, or SharePoint URL..."
          className="h-8"
        />
        <p className="text-xs text-muted-foreground">
          Supports YouTube, Vimeo, and SharePoint video links
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Title (optional)</Label>
          <Input
            value={content.title || ''}
            onChange={(e) => onChange({ ...content, title: e.target.value })}
            placeholder="Video title"
            className="h-8"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Aspect Ratio</Label>
          <Select
            value={content.aspectRatio}
            onValueChange={(value) => onChange({ ...content, aspectRatio: value as VideoEmbedContent['aspectRatio'] })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASPECT_RATIOS.map((ratio) => (
                <SelectItem key={ratio.value} value={ratio.value}>
                  {ratio.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="pt-2 border-t">
        <Label className="text-xs text-muted-foreground">Preview</Label>
        <div className="mt-2">
          {renderVideo()}
        </div>
      </div>
    </div>
  );
}
