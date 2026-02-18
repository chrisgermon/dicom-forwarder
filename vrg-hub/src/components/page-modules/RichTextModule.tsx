import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { RichTextContent } from "./types";
import DOMPurify from "dompurify";

interface RichTextModuleProps {
  content: RichTextContent;
  editing: boolean;
  onChange: (content: RichTextContent) => void;
}

export function RichTextModule({ content, editing, onChange }: RichTextModuleProps) {
  const sanitizedHtml = DOMPurify.sanitize(content.html || "");

  // Don't render anything if not editing and content is empty
  if (!editing && !content.html?.trim()) {
    return null;
  }

  if (editing) {
    return (
      <RichTextEditor
        value={content.html}
        onChange={(html) => onChange({ html })}
        placeholder="Add rich text content..."
        enableImageUpload
        className="min-h-[200px]"
      />
    );
  }

  return (
    <div 
      className="prose prose-sm max-w-none dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
