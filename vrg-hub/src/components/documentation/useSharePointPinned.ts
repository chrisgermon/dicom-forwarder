import { useState, useEffect } from 'react';

interface PinnedFolder {
  id: string;
  name: string;
  path: string;
  pinnedAt: string;
}

const STORAGE_KEY = 'sharepoint_pinned_folders';
const MAX_PINNED = 10;

export function useSharePointPinned() {
  const [pinnedFolders, setPinnedFolders] = useState<PinnedFolder[]>([]);

  // Load pinned folders from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPinnedFolders(parsed);
      }
    } catch (error) {
      console.error('Failed to load pinned folders:', error);
    }
  }, []);

  // Save to localStorage whenever pinned folders change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pinnedFolders));
    } catch (error) {
      console.error('Failed to save pinned folders:', error);
    }
  }, [pinnedFolders]);

  const pinFolder = (folder: { id: string; name: string; path: string }) => {
    setPinnedFolders((prev) => {
      // Check if already pinned
      if (prev.some((p) => p.id === folder.id)) {
        return prev;
      }

      // Enforce max limit
      const newPinned: PinnedFolder = {
        ...folder,
        pinnedAt: new Date().toISOString(),
      };

      const updated = [newPinned, ...prev];
      return updated.slice(0, MAX_PINNED);
    });
  };

  const unpinFolder = (folderId: string) => {
    setPinnedFolders((prev) => prev.filter((p) => p.id !== folderId));
  };

  const isPinned = (folderId: string): boolean => {
    return pinnedFolders.some((p) => p.id === folderId);
  };

  const togglePin = (folder: { id: string; name: string; path: string }) => {
    if (isPinned(folder.id)) {
      unpinFolder(folder.id);
    } else {
      pinFolder(folder);
    }
  };

  const clearPinned = () => {
    setPinnedFolders([]);
  };

  return {
    pinnedFolders,
    pinFolder,
    unpinFolder,
    isPinned,
    togglePin,
    clearPinned,
    canPin: pinnedFolders.length < MAX_PINNED,
  };
}
