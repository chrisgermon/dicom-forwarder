import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInlineEdit } from "@/contexts/InlineEditContext";
import { ImagePlus } from "lucide-react";

interface EditableImageProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  alt?: string;
}

export function EditableImage({
  value,
  onChange,
  className,
  alt = "Image",
}: EditableImageProps) {
  const { isEditing } = useInlineEdit();
  const [showInput, setShowInput] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  const handleSave = () => {
    onChange(localValue);
    setShowInput(false);
  };

  if (!isEditing) {
    return value ? (
      <img src={value} alt={alt} className={className} />
    ) : (
      <div className={className + " bg-muted flex items-center justify-center"}>
        No image
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {value && <img src={value} alt={alt} className={className} />}
      {showInput ? (
        <div className="flex gap-2">
          <Input
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder="Image URL"
          />
          <Button onClick={handleSave} size="sm">
            Save
          </Button>
          <Button onClick={() => setShowInput(false)} size="sm" variant="outline">
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          onClick={() => setShowInput(true)}
          size="sm"
          variant="outline"
          className="w-full"
        >
          <ImagePlus className="w-4 h-4 mr-2" />
          Change Image
        </Button>
      )}
    </div>
  );
}
