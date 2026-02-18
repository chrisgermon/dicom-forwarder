import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImagePlus } from "lucide-react";
import { useState } from "react";

interface Field {
  name: string;
  label: string;
  type: "text" | "textarea" | "image";
  value: string;
}

interface FieldEditorProps {
  fields: Field[];
  onChange: (name: string, value: string) => void;
}

export function FieldEditor({ fields, onChange }: FieldEditorProps) {
  const [imageInputVisible, setImageInputVisible] = useState<string | null>(null);
  const [tempImageUrl, setTempImageUrl] = useState("");

  const handleImageSave = (fieldName: string) => {
    onChange(fieldName, tempImageUrl);
    setImageInputVisible(null);
    setTempImageUrl("");
  };

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>{field.label}</Label>
          {field.type === "text" && (
            <Input
              id={field.name}
              value={field.value}
              onChange={(e) => onChange(field.name, e.target.value)}
              className="w-full"
            />
          )}
          {field.type === "textarea" && (
            <Textarea
              id={field.name}
              value={field.value}
              onChange={(e) => onChange(field.name, e.target.value)}
              className="w-full min-h-[100px]"
            />
          )}
          {field.type === "image" && (
            <div className="space-y-2">
              {field.value && (
                <img
                  src={field.value}
                  alt={field.label}
                  className="w-full h-32 object-cover rounded border"
                />
              )}
              {imageInputVisible === field.name ? (
                <div className="flex gap-2">
                  <Input
                    value={tempImageUrl}
                    onChange={(e) => setTempImageUrl(e.target.value)}
                    placeholder="Image URL"
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleImageSave(field.name)}
                    size="sm"
                  >
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setImageInputVisible(null);
                      setTempImageUrl("");
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    setImageInputVisible(field.name);
                    setTempImageUrl(field.value);
                  }}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  <ImagePlus className="w-4 h-4 mr-2" />
                  Change Image
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
