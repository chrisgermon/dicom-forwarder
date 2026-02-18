// Card, CardContent not currently used
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface Tile {
  id: string;
  title: string;
  url: string;
  color?: string;
  width?: number; // 1-4 grid columns
  height?: number; // Aspect ratio multiplier
}

interface QuickAccessTilesProps {
  tiles?: Tile[];
  isEditing?: boolean;
  onUpdate?: (tiles: Tile[]) => void;
}

const defaultTiles: Tile[] = [];

export function QuickAccessTiles({ 
  tiles = defaultTiles,
  isEditing = false,
  onUpdate
}: QuickAccessTilesProps) {
  const [currentTiles, setCurrentTiles] = useState<Tile[]>(tiles);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTile, setEditingTile] = useState<Tile | null>(null);
  const [formData, setFormData] = useState({ title: "", url: "", color: "", width: 1, height: 1 });
  // Resizing state removed - not currently used

  const handleAddTile = () => {
    setEditingTile(null);
    setFormData({ title: "", url: "", color: "hsl(var(--primary))", width: 1, height: 1 });
    setIsDialogOpen(true);
  };

  const handleEditTile = (tile: Tile) => {
    setEditingTile(tile);
    setFormData({ 
      title: tile.title, 
      url: tile.url, 
      color: tile.color || "", 
      width: tile.width || 1,
      height: tile.height || 1
    });
    setIsDialogOpen(true);
  };

  const handleSaveTile = () => {
    if (editingTile) {
      const updatedTiles = currentTiles.map(t => 
        t.id === editingTile.id ? { ...t, ...formData } : t
      );
      setCurrentTiles(updatedTiles);
      onUpdate?.(updatedTiles);
    } else {
      const newTile: Tile = {
        id: Date.now().toString(),
        ...formData
      };
      const updatedTiles = [...currentTiles, newTile];
      setCurrentTiles(updatedTiles);
      onUpdate?.(updatedTiles);
    }
    setIsDialogOpen(false);
  };

  const handleDeleteTile = (id: string) => {
    const updatedTiles = currentTiles.filter(t => t.id !== id);
    setCurrentTiles(updatedTiles);
    onUpdate?.(updatedTiles);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {currentTiles.map((tile) => {
          const colSpan = tile.width || 1;
          const rowSpan = tile.height || 1;
          
          return (
            <div 
              key={tile.id} 
              className="relative group"
              style={{
                gridColumn: `span ${Math.min(colSpan, 2)}`,
                gridRow: `span ${rowSpan}`
              }}
            >
              <a 
                href={tile.url}
                className="block h-40 rounded-xl text-white font-semibold text-lg flex items-center justify-center transition-all duration-300 hover:shadow-xl hover:scale-[1.02] shadow-md"
                style={{ backgroundColor: tile.color }}
              >
                <span className="text-center px-4">{tile.title}</span>
              </a>
              {isEditing && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    onClick={() => handleEditTile(tile)}
                    size="sm"
                    variant="secondary"
                    className="h-7 w-7 p-0 shadow-md"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteTile(tile.id)}
                    size="sm"
                    variant="destructive"
                    className="h-7 w-7 p-0 shadow-md"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        {isEditing && (
          <button
            onClick={handleAddTile}
            className="h-40 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-accent/30 transition-all duration-200 flex items-center justify-center group"
          >
            <Plus className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        )}
      </div>
      {!isEditing && currentTiles.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No quick access tiles yet</p>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTile ? "Edit Tile" : "Add Tile"}</DialogTitle>
            <DialogDescription>Configure the title, URL, size and color of this quick access tile.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., IntelePACS"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="width">Width (columns: {formData.width})</Label>
              <Slider
                id="width"
                min={1}
                max={4}
                step={1}
                value={[formData.width]}
                onValueChange={(value) => setFormData({ ...formData, width: value[0] })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height (rows: {formData.height})</Label>
              <Slider
                id="height"
                min={1}
                max={3}
                step={1}
                value={[formData.height]}
                onValueChange={(value) => setFormData({ ...formData, height: value[0] })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTile}>
              {editingTile ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
