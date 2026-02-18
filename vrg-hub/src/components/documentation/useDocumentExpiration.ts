import { useState, useEffect } from 'react';

export interface DocumentExpirationData {
  fileId: string;
  expirationDate?: Date;
  reminderDays?: number[];
  expirationReason?: string;
  renewalRequired?: boolean;
  renewalContact?: string;
  lastReminderSent?: Date;
}

const STORAGE_KEY = 'sharepoint_document_expirations';

/**
 * Hook for managing document expiration data
 * Stores expiration information in localStorage
 */
export function useDocumentExpiration() {
  const [expirations, setExpirations] = useState<Map<string, DocumentExpirationData>>(new Map());

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const map = new Map<string, DocumentExpirationData>();

        // Convert date strings back to Date objects
        Object.entries(parsed).forEach(([fileId, data]: [string, any]) => {
          map.set(fileId, {
            ...data,
            expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
            lastReminderSent: data.lastReminderSent ? new Date(data.lastReminderSent) : undefined,
          });
        });

        setExpirations(map);
      }
    } catch (error) {
      console.error('Error loading document expirations:', error);
    }
  }, []);

  // Save to localStorage whenever expirations change
  const saveToStorage = (map: Map<string, DocumentExpirationData>) => {
    try {
      const obj: Record<string, any> = {};
      map.forEach((value, key) => {
        obj[key] = {
          ...value,
          expirationDate: value.expirationDate?.toISOString(),
          lastReminderSent: value.lastReminderSent?.toISOString(),
        };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (error) {
      console.error('Error saving document expirations:', error);
    }
  };

  const setExpiration = (fileId: string, data: Omit<DocumentExpirationData, 'fileId'>) => {
    setExpirations((prev) => {
      const newMap = new Map(prev);
      newMap.set(fileId, { fileId, ...data });
      saveToStorage(newMap);
      return newMap;
    });
  };

  const removeExpiration = (fileId: string) => {
    setExpirations((prev) => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      saveToStorage(newMap);
      return newMap;
    });
  };

  const getExpiration = (fileId: string): DocumentExpirationData | undefined => {
    return expirations.get(fileId);
  };

  const updateReminderSent = (fileId: string) => {
    const existing = expirations.get(fileId);
    if (existing) {
      setExpiration(fileId, {
        ...existing,
        lastReminderSent: new Date(),
      });
    }
  };

  // Get all expiring documents (within next 90 days)
  const getExpiringDocuments = () => {
    const now = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const expiring: DocumentExpirationData[] = [];

    expirations.forEach((data) => {
      if (data.expirationDate) {
        const expirationDate = new Date(data.expirationDate);
        if (expirationDate >= now && expirationDate <= ninetyDaysFromNow) {
          expiring.push(data);
        }
      }
    });

    // Sort by expiration date (soonest first)
    return expiring.sort((a, b) => {
      const dateA = a.expirationDate ? new Date(a.expirationDate).getTime() : Infinity;
      const dateB = b.expirationDate ? new Date(b.expirationDate).getTime() : Infinity;
      return dateA - dateB;
    });
  };

  // Get expired documents
  const getExpiredDocuments = () => {
    const now = new Date();
    const expired: DocumentExpirationData[] = [];

    expirations.forEach((data) => {
      if (data.expirationDate) {
        const expirationDate = new Date(data.expirationDate);
        if (expirationDate < now) {
          expired.push(data);
        }
      }
    });

    return expired;
  };

  // Get documents needing reminders today
  const getDocumentsNeedingReminders = () => {
    const now = new Date();
    const needingReminders: DocumentExpirationData[] = [];

    expirations.forEach((data) => {
      if (!data.expirationDate || !data.reminderDays || data.reminderDays.length === 0) {
        return;
      }

      const expirationDate = new Date(data.expirationDate);
      const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Check if any reminder threshold is reached
      const shouldRemind = data.reminderDays.some(days => daysUntilExpiration <= days);

      if (shouldRemind) {
        // Check if we haven't sent a reminder recently (within 24 hours)
        if (data.lastReminderSent) {
          const hoursSinceLastReminder = (now.getTime() - new Date(data.lastReminderSent).getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastReminder < 24) {
            return; // Skip if reminded within last 24 hours
          }
        }

        needingReminders.push(data);
      }
    });

    return needingReminders;
  };

  const clearAll = () => {
    setExpirations(new Map());
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    expirations,
    setExpiration,
    removeExpiration,
    getExpiration,
    updateReminderSent,
    getExpiringDocuments,
    getExpiredDocuments,
    getDocumentsNeedingReminders,
    clearAll,
  };
}
