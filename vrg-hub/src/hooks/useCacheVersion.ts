/**
 * Hook to manage cache versioning and force refresh on new deployments
 * Clears service worker caches, React Query cache, and IndexedDB when version changes
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

// This will be updated on each build via Vite's define
const APP_VERSION = __APP_VERSION__;
const CACHE_VERSION_KEY = 'crowdhub-cache-version';

declare const __APP_VERSION__: string;

/**
 * Clears all service worker caches
 */
async function clearServiceWorkerCaches(): Promise<void> {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      logger.info('Service worker caches cleared', { cacheNames });
    } catch (error) {
      logger.warn('Failed to clear service worker caches', error);
    }
  }
}

/**
 * Unregisters and re-registers service workers to force update
 */
async function refreshServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.update();
      }
      logger.info('Service workers updated');
    } catch (error) {
      logger.warn('Failed to refresh service workers', error);
    }
  }
}

/**
 * Clears IndexedDB databases
 */
async function clearIndexedDB(): Promise<void> {
  try {
    const databases = await indexedDB.databases?.();
    if (databases) {
      await Promise.all(
        databases
          .filter(db => db.name && db.name.startsWith('crowdhub'))
          .map(db => {
            return new Promise<void>((resolve, reject) => {
              const request = indexedDB.deleteDatabase(db.name!);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            });
          })
      );
      logger.info('IndexedDB databases cleared');
    }
  } catch (error) {
    logger.warn('Failed to clear IndexedDB', error);
  }
}

/**
 * Gets the stored cache version
 */
function getStoredVersion(): string | null {
  try {
    return localStorage.getItem(CACHE_VERSION_KEY);
  } catch {
    return null;
  }
}

/**
 * Stores the current cache version
 */
function setStoredVersion(version: string): void {
  try {
    localStorage.setItem(CACHE_VERSION_KEY, version);
  } catch (error) {
    logger.warn('Failed to store cache version', error);
  }
}

/**
 * Hook that manages cache versioning
 * On version mismatch, clears all caches and forces fresh data
 */
export function useCacheVersion() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkVersion = async () => {
      const storedVersion = getStoredVersion();
      
      // If no version stored or version mismatch, clear everything
      if (storedVersion !== APP_VERSION) {
        logger.info('Cache version mismatch detected', {
          storedVersion,
          currentVersion: APP_VERSION,
        });

        // Clear all caches
        await Promise.all([
          clearServiceWorkerCaches(),
          clearIndexedDB(),
          refreshServiceWorker(),
        ]);

        // Clear React Query cache
        queryClient.clear();

        // Store new version
        setStoredVersion(APP_VERSION);

        logger.info('All caches cleared for new version', { version: APP_VERSION });
      }
    };

    checkVersion();
  }, [queryClient]);

  return { version: APP_VERSION };
}
