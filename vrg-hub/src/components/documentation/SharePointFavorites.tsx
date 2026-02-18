import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Folder, Loader2 } from 'lucide-react';
import { useSharePointFavorites } from './useSharePointFavorites';
import { FileTypeIcon } from './FileTypeIcon';

interface SharePointFavoritesProps {
  onNavigate: (path: string, name: string) => void;
  onFileClick: (fileUrl: string, fileName: string) => void;
}

export function SharePointFavorites({ onNavigate, onFileClick }: SharePointFavoritesProps) {
  const { favorites, loading, removeFavorite } = useSharePointFavorites();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Favorites
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (favorites.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Favorites
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No favorites yet. Click the star icon on any file or folder to add it here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 fill-primary" />
          Favorites ({favorites.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent group"
            >
              {fav.item_type === 'folder' ? (
                <Folder className="h-4 w-4 text-primary flex-shrink-0" />
              ) : (
                <FileTypeIcon fileName={fav.item_name} className="h-4 w-4 text-primary flex-shrink-0" />
              )}
              <button
                onClick={() => {
                  if (fav.item_type === 'folder') {
                    onNavigate(fav.item_path, fav.item_name);
                  } else if (fav.item_url) {
                    onFileClick(fav.item_url, fav.item_name);
                  }
                }}
                className="flex-1 text-left text-sm truncate hover:underline"
              >
                {fav.item_name}
              </button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={() => removeFavorite(fav.item_id)}
              >
                <Star className="h-3 w-3 fill-primary" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
