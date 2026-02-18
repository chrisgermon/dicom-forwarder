import { useState, useEffect } from 'react';
import { SearchFilters, SavedSearch } from './EnhancedSearch';

const STORAGE_KEY = 'sharepoint_saved_searches';
const MAX_SAVED = 10;

export function useSavedSearches() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  // Load saved searches from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const searches = parsed.map((search: SavedSearch) => ({
          ...search,
          filters: {
            ...search.filters,
            dateFrom: search.filters.dateFrom ? new Date(search.filters.dateFrom) : undefined,
            dateTo: search.filters.dateTo ? new Date(search.filters.dateTo) : undefined,
          },
        }));
        setSavedSearches(searches);
      }
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    }
  }, []);

  // Save to localStorage whenever saved searches change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSearches));
    } catch (error) {
      console.error('Failed to save searches:', error);
    }
  }, [savedSearches]);

  const saveSearch = (name: string, filters: SearchFilters) => {
    const newSearch: SavedSearch = {
      id: `search-${Date.now()}`,
      name,
      filters,
      savedAt: new Date().toISOString(),
    };

    setSavedSearches((prev) => {
      // Check if a search with this name already exists
      const existing = prev.find(s => s.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        // Update existing search
        return prev.map(s => s.id === existing.id ? newSearch : s);
      }

      // Add new search, enforce max limit
      const updated = [newSearch, ...prev];
      return updated.slice(0, MAX_SAVED);
    });
  };

  const deleteSearch = (searchId: string) => {
    setSavedSearches((prev) => prev.filter((s) => s.id !== searchId));
  };

  const loadSearch = (search: SavedSearch): SearchFilters => {
    return search.filters;
  };

  const clearAll = () => {
    setSavedSearches([]);
  };

  return {
    savedSearches,
    saveSearch,
    deleteSearch,
    loadSearch,
    clearAll,
    canSave: savedSearches.length < MAX_SAVED,
  };
}
