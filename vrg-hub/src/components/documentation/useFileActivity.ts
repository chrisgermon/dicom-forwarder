import { useState, useEffect } from 'react';
import { FileActivity, ActivityType } from './FileActivityFeed';

const STORAGE_KEY = 'sharepoint_file_activities';
const MAX_ACTIVITIES = 100; // Keep last 100 activities

/**
 * Hook for managing file activity tracking
 * In production, this would integrate with backend audit logging
 * For now, stores activities in localStorage for demonstration
 */
export function useFileActivity() {
  const [activities, setActivities] = useState<FileActivity[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setActivities(parsed);
      } else {
        // Initialize with some sample activities for demo
        const sampleActivities = generateSampleActivities();
        setActivities(sampleActivities);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleActivities));
      }
    } catch (error) {
      console.error('Error loading file activities:', error);
    }
  }, []);

  // Save to localStorage whenever activities change
  const saveToStorage = (newActivities: FileActivity[]) => {
    try {
      // Keep only the most recent MAX_ACTIVITIES
      const limited = newActivities.slice(0, MAX_ACTIVITIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
      setActivities(limited);
    } catch (error) {
      console.error('Error saving file activities:', error);
    }
  };

  const addActivity = (
    type: ActivityType,
    fileName: string,
    fileType: string | undefined,
    details?: string,
    path?: string
  ) => {
    // Get current user info (in production, from auth context)
    const user = {
      name: 'Current User', // TODO: Get from auth context
      email: 'user@visionradiology.com.au',
    };

    const newActivity: FileActivity = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      fileName,
      fileType,
      user,
      timestamp: new Date().toISOString(),
      details,
      path,
    };

    const updated = [newActivity, ...activities];
    saveToStorage(updated);
  };

  const getActivitiesForPath = (path: string, limit?: number) => {
    const pathActivities = activities.filter(
      (activity) => activity.path === path || activity.path?.startsWith(path + '/')
    );

    return limit ? pathActivities.slice(0, limit) : pathActivities;
  };

  const getActivitiesForFile = (fileName: string, limit?: number) => {
    const fileActivities = activities.filter(
      (activity) => activity.fileName === fileName
    );

    return limit ? fileActivities.slice(0, limit) : fileActivities;
  };

  const getRecentActivities = (limit: number = 10) => {
    return activities.slice(0, limit);
  };

  const clearActivities = () => {
    setActivities([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    activities,
    addActivity,
    getActivitiesForPath,
    getActivitiesForFile,
    getRecentActivities,
    clearActivities,
  };
}

// Generate sample activities for demonstration
function generateSampleActivities(): FileActivity[] {
  const users = [
    { name: 'Dr. Sarah Chen', email: 'sarah.chen@visionradiology.com.au' },
    { name: 'John Smith', email: 'john.smith@visionradiology.com.au' },
    { name: 'Maria Garcia', email: 'maria.garcia@visionradiology.com.au' },
    { name: 'David Lee', email: 'david.lee@visionradiology.com.au' },
  ];

  const files = [
    { name: 'CT_Protocol_2026.pdf', type: 'pdf', path: '/Radiology/Protocols' },
    { name: 'MRI_Safety_Guidelines.docx', type: 'docx', path: '/Radiology/Safety' },
    { name: 'Patient_Consent_Form.pdf', type: 'pdf', path: '/Clinical/Forms' },
    { name: 'Equipment_Maintenance_Log.xlsx', type: 'xlsx', path: '/IT/Equipment' },
    { name: 'Staff_Training_2026.pptx', type: 'pptx', path: '/HR/Training' },
    { name: 'Incident_Report_Template.docx', type: 'docx', path: '/Clinical/Templates' },
  ];

  const activityTypes: ActivityType[] = [
    'upload', 'download', 'view', 'edit', 'share', 'rename', 'move', 'copy'
  ];

  const activities: FileActivity[] = [];

  // Generate 20 sample activities over the last 7 days
  for (let i = 0; i < 20; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomFile = files[Math.floor(Math.random() * files.length)];
    const randomType = activityTypes[Math.floor(Math.random() * activityTypes.length)];

    // Random timestamp within last 7 days
    const daysAgo = Math.floor(Math.random() * 7);
    const hoursAgo = Math.floor(Math.random() * 24);
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - daysAgo);
    timestamp.setHours(timestamp.getHours() - hoursAgo);

    let details = '';
    switch (randomType) {
      case 'upload':
        details = 'New version uploaded';
        break;
      case 'edit':
        details = 'Updated content and formatting';
        break;
      case 'share':
        details = 'Shared with Radiology team';
        break;
      case 'rename':
        details = `Renamed from ${randomFile.name.replace('.', '_old.')}`;
        break;
      case 'move':
        details = `Moved from ${randomFile.path}/Archive`;
        break;
      case 'copy':
        details = `Copied to ${randomFile.path}/Backup`;
        break;
    }

    activities.push({
      id: `sample_${i}_${Date.now()}`,
      type: randomType,
      fileName: randomFile.name,
      fileType: randomFile.type,
      user: randomUser,
      timestamp: timestamp.toISOString(),
      details: details || undefined,
      path: randomFile.path,
    });
  }

  // Sort by timestamp (newest first)
  return activities.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
