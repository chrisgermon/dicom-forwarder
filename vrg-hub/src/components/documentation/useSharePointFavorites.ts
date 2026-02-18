import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FavoriteItem {
  id: string;
  item_type: 'file' | 'folder';
  item_id: string;
  item_name: string;
  item_path: string;
  item_url: string | null;
  created_at: string;
}

export function useSharePointFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const loadFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('sharepoint_favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedData = (data || []) as FavoriteItem[];
      setFavorites(typedData);
      setFavoriteIds(new Set(typedData.map(f => f.item_id)));
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const addFavorite = async (item: {
    item_type: 'file' | 'folder';
    item_id: string;
    item_name: string;
    item_path: string;
    item_url?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('sharepoint_favorites')
        .insert({
          user_id: user.id,
          ...item,
        });

      if (error) throw error;

      await loadFavorites();
      toast.success('Added to favorites');
    } catch (error: any) {
      console.error('Error adding favorite:', error);
      if (error.code === '23505') {
        toast.error('Already in favorites');
      } else {
        toast.error('Failed to add favorite');
      }
    }
  };

  const removeFavorite = async (itemId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('sharepoint_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', itemId);

      if (error) throw error;

      await loadFavorites();
      toast.success('Removed from favorites');
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error('Failed to remove favorite');
    }
  };

  const isFavorite = (itemId: string) => favoriteIds.has(itemId);

  const toggleFavorite = async (item: {
    item_type: 'file' | 'folder';
    item_id: string;
    item_name: string;
    item_path: string;
    item_url?: string;
  }) => {
    if (isFavorite(item.item_id)) {
      await removeFavorite(item.item_id);
    } else {
      await addFavorite(item);
    }
  };

  return {
    favorites,
    loading,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    reload: loadFavorites,
  };
}
