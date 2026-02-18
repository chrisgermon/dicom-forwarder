import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RecentItem {
  id: string;
  item_type: 'file' | 'folder';
  item_id: string;
  item_name: string;
  item_path: string;
  item_url: string | null;
  last_accessed_at: string;
}

export function useSharePointRecent() {
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('sharepoint_recent_items')
        .select('*')
        .eq('user_id', user.id)
        .order('last_accessed_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const typedData = (data || []) as RecentItem[];
      setRecentItems(typedData);
    } catch (error) {
      console.error('Error loading recent items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecent();
  }, []);

  const trackAccess = async (item: {
    item_type: 'file' | 'folder';
    item_id: string;
    item_name: string;
    item_path: string;
    item_url?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upsert: insert or update last_accessed_at
      const { error } = await supabase
        .from('sharepoint_recent_items')
        .upsert(
          {
            user_id: user.id,
            ...item,
            last_accessed_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,item_id' }
        );

      if (error) throw error;

      await loadRecent();
    } catch (error) {
      console.error('Error tracking access:', error);
    }
  };

  return {
    recentItems,
    loading,
    trackAccess,
    reload: loadRecent,
  };
}
