/**
 * Hook for managing offline cache with IndexedDB
 * Provides caching layer with automatic expiration and sync
 */

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  setCache,
  getCache,
  deleteCache,
  addToOfflineQueue,
  getOfflineQueue,
  removeFromOfflineQueue,
  updateQueueItemRetries,
  setUserData,
  getUserData,
  clearUserData,
  clearExpiredCache,
  OfflineQueueItem,
} from '@/lib/indexeddb';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

const MAX_RETRIES = 3;
const CACHE_KEYS = {
  USER_PROFILE: 'user-profile',
  USER_PERMISSIONS: 'user-permissions',
  RECENT_REQUESTS: 'recent-requests',
  BRANDS: 'brands',
  LOCATIONS: 'locations',
} as const;

export function useOfflineCache() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: 'Back online',
        description: 'Syncing pending changes...',
      });
      syncOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: 'You are offline',
        description: 'Changes will be synced when you reconnect.',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Clear expired cache on mount
    clearExpiredCache();

    // Check pending queue
    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updatePendingCount = useCallback(async () => {
    const queue = await getOfflineQueue();
    setPendingCount(queue.length);
  }, []);

  /**
   * Sync all pending offline operations
   */
  const syncOfflineQueue = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    const queue = await getOfflineQueue();

    for (const item of queue) {
      try {
        await processQueueItem(item);
        await removeFromOfflineQueue(item.id);
        logger.info('Synced offline operation', { id: item.id, type: item.type });
      } catch (error) {
        logger.error('Failed to sync offline operation', error as Error, { item });
        
        if (item.retries >= MAX_RETRIES) {
          await removeFromOfflineQueue(item.id);
          toast({
            title: 'Sync failed',
            description: `Failed to sync ${item.type} operation after ${MAX_RETRIES} attempts`,
            variant: 'destructive',
          });
        } else {
          await updateQueueItemRetries(item.id, item.retries + 1);
        }
      }
    }

    setIsSyncing(false);
    await updatePendingCount();

    // Invalidate queries to refresh data
    queryClient.invalidateQueries();
  }, [isSyncing, queryClient, toast]);

  const processQueueItem = async (item: OfflineQueueItem) => {
    // Use type assertion for dynamic table names in offline sync
    const table = item.table as 'tickets' | 'notifications' | 'hardware_requests';
    switch (item.type) {
      case 'create':
        await supabase.from(table).insert(item.data as never);
        break;
      case 'update':
        const { id, ...updateData } = item.data as { id: string; [key: string]: unknown };
        await supabase.from(table).update(updateData as never).eq('id', id);
        break;
      case 'delete':
        await supabase.from(table).delete().eq('id', item.data.id as string);
        break;
    }
  };

  /**
   * Queue an operation for offline sync
   */
  const queueOperation = useCallback(async (
    type: 'create' | 'update' | 'delete',
    table: string,
    data: Record<string, unknown>
  ) => {
    if (navigator.onLine) {
      // Execute immediately if online
      await processQueueItem({ id: '', type, table, data, timestamp: Date.now(), retries: 0 });
    } else {
      // Queue for later sync
      await addToOfflineQueue({ type, table, data });
      await updatePendingCount();
      toast({
        title: 'Saved offline',
        description: 'This change will sync when you\'re back online.',
      });
    }
  }, [toast]);

  /**
   * Cache user profile for offline access
   */
  const cacheUserProfile = useCallback(async (profile: Record<string, unknown>) => {
    await setUserData(CACHE_KEYS.USER_PROFILE, profile);
  }, []);

  /**
   * Get cached user profile
   */
  const getCachedUserProfile = useCallback(async () => {
    return getUserData<Record<string, unknown>>(CACHE_KEYS.USER_PROFILE);
  }, []);

  /**
   * Cache user permissions for offline access
   */
  const cacheUserPermissions = useCallback(async (permissions: string[]) => {
    await setUserData(CACHE_KEYS.USER_PERMISSIONS, permissions);
  }, []);

  /**
   * Get cached user permissions
   */
  const getCachedUserPermissions = useCallback(async () => {
    return getUserData<string[]>(CACHE_KEYS.USER_PERMISSIONS);
  }, []);

  /**
   * Cache data with optional TTL
   */
  const cacheData = useCallback(async <T>(key: string, data: T, ttlMs?: number) => {
    await setCache(key, data, ttlMs);
  }, []);

  /**
   * Get cached data
   */
  const getCachedData = useCallback(async <T>(key: string): Promise<T | null> => {
    return getCache<T>(key);
  }, []);

  /**
   * Clear all cached data on logout
   */
  const clearAllCache = useCallback(async () => {
    await clearUserData();
    // Clear specific cache keys
    await deleteCache(CACHE_KEYS.USER_PROFILE);
    await deleteCache(CACHE_KEYS.USER_PERMISSIONS);
    await deleteCache(CACHE_KEYS.RECENT_REQUESTS);
    await deleteCache(CACHE_KEYS.BRANDS);
    await deleteCache(CACHE_KEYS.LOCATIONS);
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    queueOperation,
    syncOfflineQueue,
    cacheUserProfile,
    getCachedUserProfile,
    cacheUserPermissions,
    getCachedUserPermissions,
    cacheData,
    getCachedData,
    clearAllCache,
    CACHE_KEYS,
  };
}
