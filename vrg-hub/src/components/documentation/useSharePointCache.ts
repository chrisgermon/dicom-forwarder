import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { useState, useEffect, useCallback } from 'react';

interface SharePointCacheDB extends DBSchema {
  items: {
    key: string; // path
    value: {
      path: string;
      folders: any[];
      files: any[];
      cachedAt: number;
      expiresAt: number;
    };
  };
  searches: {
    key: string; // search query
    value: {
      query: string;
      folders: any[];
      files: any[];
      cachedAt: number;
      expiresAt: number;
    };
  };
}

const DB_NAME = 'sharepoint-cache';
const DB_VERSION = 1;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for faster repeat navigation

let dbInstance: IDBPDatabase<SharePointCacheDB> | null = null;

async function getDB(): Promise<IDBPDatabase<SharePointCacheDB>> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<SharePointCacheDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('items')) {
        db.createObjectStore('items', { keyPath: 'path' });
      }
      if (!db.objectStoreNames.contains('searches')) {
        db.createObjectStore('searches', { keyPath: 'query' });
      }
    },
  });
  
  return dbInstance;
}

export function useSharePointCache() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getDB().then(() => setReady(true)).catch(console.error);
  }, []);

  const getCachedItems = useCallback(async (path: string) => {
    if (!ready) return null;
    
    try {
      const db = await getDB();
      const cached = await db.get('items', path);
      
      if (!cached) return null;
      if (Date.now() > cached.expiresAt) {
        // Expired, delete it
        await db.delete('items', path);
        return null;
      }
      
      return {
        folders: cached.folders,
        files: cached.files,
        fromCache: true,
        cachedAt: new Date(cached.cachedAt).toISOString(),
      };
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }, [ready]);

  const setCachedItems = useCallback(async (path: string, folders: any[], files: any[]) => {
    if (!ready) return;
    
    try {
      const db = await getDB();
      await db.put('items', {
        path,
        folders,
        files,
        cachedAt: Date.now(),
        expiresAt: Date.now() + CACHE_DURATION,
      });
    } catch (error) {
      console.error('Error writing cache:', error);
    }
  }, [ready]);

  const getCachedSearch = useCallback(async (query: string) => {
    if (!ready) return null;
    
    try {
      const db = await getDB();
      const cached = await db.get('searches', query);
      
      if (!cached) return null;
      if (Date.now() > cached.expiresAt) {
        await db.delete('searches', query);
        return null;
      }
      
      return {
        folders: cached.folders,
        files: cached.files,
      };
    } catch (error) {
      console.error('Error reading search cache:', error);
      return null;
    }
  }, [ready]);

  const setCachedSearch = useCallback(async (query: string, folders: any[], files: any[]) => {
    if (!ready) return;
    
    try {
      const db = await getDB();
      await db.put('searches', {
        query,
        folders,
        files,
        cachedAt: Date.now(),
        expiresAt: Date.now() + CACHE_DURATION,
      });
    } catch (error) {
      console.error('Error writing search cache:', error);
    }
  }, [ready]);

  const clearCache = useCallback(async () => {
    if (!ready) return;
    
    try {
      const db = await getDB();
      await db.clear('items');
      await db.clear('searches');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }, [ready]);

  const clearPath = useCallback(async (path: string) => {
    if (!ready) return;
    
    try {
      const db = await getDB();
      // Delete the exact path
      await db.delete('items', path);
      
      // Also clear any subpaths that start with this path
      const allKeys = await db.getAllKeys('items');
      for (const key of allKeys) {
        if (key.startsWith(path + '/')) {
          await db.delete('items', key);
        }
      }
      
      // Clear parent path cache too
      const parentPath = path.includes('/') 
        ? path.substring(0, path.lastIndexOf('/')) || '/'
        : '/';
      await db.delete('items', parentPath);
      
      console.log(`Cleared client cache for path: ${path}`);
    } catch (error) {
      console.error('Error clearing path from cache:', error);
    }
  }, [ready]);

  return {
    ready,
    getCachedItems,
    setCachedItems,
    getCachedSearch,
    setCachedSearch,
    clearCache,
    clearPath,
  };
}
