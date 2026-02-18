import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { ImageItem, ImageGalleryContent } from "./types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ImageGalleryModuleProps {
  content: ImageGalleryContent;
  editing: boolean;
  onChange: (content: ImageGalleryContent) => void;
}

export function ImageGalleryModule({ content, editing, onChange }: ImageGalleryModuleProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newImage, setNewImage] = useState<Partial<ImageItem>>({});

  const addImage = () => {
    if (!newImage.url) return;
    
    const image: ImageItem = {
      id: crypto.randomUUID(),
      url: newImage.url,
      caption: newImage.caption,
    };
    
    onChange({ ...content, images: [...content.images, image] });
    setNewImage({});
    setDialogOpen(false);
  };

  const removeImage = (id: string) => {
    onChange({ ...content, images: content.images.filter(img => img.id !== id) });
  };

  if (!editing && content.images.length === 0) {
    return <p className="text-muted-foreground text-sm italic">No images added yet.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {content.images.map((image) => (
          <div key={image.id} className="group relative">
            {editing && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={() => removeImage(image.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={image.url}
                alt={image.caption || "Gallery image"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
            </div>
            {image.caption && (
              <p className="text-sm text-muted-foreground mt-1 text-center">{image.caption}</p>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="mt-2">
              <Plus className="h-4 w-4 mr-2" />
              Add Image
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Image</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Image URL *</Label>
                <Input
                  value={newImage.url || ""}
                  onChange={(e) => setNewImage({ ...newImage, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Caption (optional)</Label>
                <Input
                  value={newImage.caption || ""}
                  onChange={(e) => setNewImage({ ...newImage, caption: e.target.value })}
                  placeholder="Image caption"
                />
              </div>
              <Button onClick={addImage} disabled={!newImage.url}>
                <ImageIcon className="h-4 w-4 mr-2" />
                Add Image
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
