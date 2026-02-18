import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import { EmbedCodeContent } from "./types";

interface EmbedCodeModuleProps {
  content: EmbedCodeContent;
  editing: boolean;
  onChange: (content: EmbedCodeContent) => void;
}

export function EmbedCodeModule({ content, editing, onChange }: EmbedCodeModuleProps) {
  if (!editing) {
    if (!content.code) {
      return <p className="text-muted-foreground text-sm italic">No embed code added yet.</p>;
    }
    
    return (
      <div 
        className="w-full overflow-hidden rounded-lg"
        style={{ minHeight: content.height || 300 }}
        dangerouslySetInnerHTML={{ __html: content.code }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
        <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
        <p className="text-yellow-800 dark:text-yellow-200">
          Only embed code from trusted sources. Malicious code can compromise security.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Embed Code (HTML/iframe)</Label>
        <Textarea
          value={content.code}
          onChange={(e) => onChange({ ...content, code: e.target.value })}
          placeholder="<iframe src='...'></iframe>"
          className="min-h-[120px] font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Minimum Height (px)</Label>
        <Input
          type="number"
          value={content.height || 300}
          onChange={(e) => onChange({ ...content, height: parseInt(e.target.value) || 300 })}
          className="h-8 w-32"
          min={100}
          max={1000}
        />
      </div>

      {content.code && (
        <div className="pt-2 border-t">
          <Label className="text-xs text-muted-foreground">Preview</Label>
          <div 
            className="mt-2 rounded-lg border overflow-hidden bg-background"
            style={{ minHeight: content.height || 300 }}
            dangerouslySetInnerHTML={{ __html: content.code }}
          />
        </div>
      )}
    </div>
  );
}
