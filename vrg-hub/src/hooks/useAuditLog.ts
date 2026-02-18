import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

export type AuditAction = 
  | 'VIEW' 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'EXPORT' 
  | 'IMPORT' 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'DOWNLOAD'
  | 'UPLOAD'
  | 'SHARE'
  | 'APPROVE'
  | 'REJECT'
  | 'SUBMIT'
  | 'COMPLETE'
  | 'ARCHIVE'
  | 'RESTORE'
  | 'ASSIGN'
  | 'UNASSIGN'
  | 'SEND'
  | 'ACCESS';

export interface AuditLogParams {
  action: AuditAction;
  tableName: string;
  recordId?: string;
  oldData?: Record<string, any> | null;
  newData?: Record<string, any> | null;
  metadata?: Record<string, any>;
}

/**
 * Hook for logging user actions to the audit_logs table.
 * Provides a consistent way to track all user activities in the system.
 */
export function useAuditLog() {
  const { user } = useAuth();

  /**
   * Log a user action to the audit_logs table
   */
  const logAction = useCallback(async ({
    action,
    tableName,
    recordId,
    oldData,
    newData,
    metadata,
  }: AuditLogParams): Promise<void> => {
    try {
      // Merge metadata into new_data if provided
      const enrichedNewData = metadata 
        ? { ...newData, _metadata: metadata }
        : newData;

      const { error } = await supabase.from('audit_logs').insert({
        user_id: user?.id || null,
        user_email: user?.email || null,
        action,
        table_name: tableName,
        record_id: recordId || null,
        old_data: oldData || null,
        new_data: enrichedNewData || null,
      });

      if (error) {
        logger.error('Failed to log audit action', error);
      }
    } catch (err) {
      // Silently fail - audit logging should not break the app
      logger.error('Audit logging error', err);
    }
  }, [user]);

  /**
   * Log a page view action
   */
  const logView = useCallback(async (
    tableName: string, 
    recordId?: string,
    metadata?: Record<string, any>
  ) => {
    await logAction({
      action: 'VIEW',
      tableName,
      recordId,
      metadata,
    });
  }, [logAction]);

  /**
   * Log a create action
   */
  const logCreate = useCallback(async (
    tableName: string,
    recordId: string,
    newData?: Record<string, any>
  ) => {
    await logAction({
      action: 'CREATE',
      tableName,
      recordId,
      newData,
    });
  }, [logAction]);

  /**
   * Log an update action
   */
  const logUpdate = useCallback(async (
    tableName: string,
    recordId: string,
    oldData?: Record<string, any>,
    newData?: Record<string, any>
  ) => {
    await logAction({
      action: 'UPDATE',
      tableName,
      recordId,
      oldData,
      newData,
    });
  }, [logAction]);

  /**
   * Log a delete action
   */
  const logDelete = useCallback(async (
    tableName: string,
    recordId: string,
    oldData?: Record<string, any>
  ) => {
    await logAction({
      action: 'DELETE',
      tableName,
      recordId,
      oldData,
    });
  }, [logAction]);

  /**
   * Log an export action
   */
  const logExport = useCallback(async (
    tableName: string,
    metadata?: Record<string, any>
  ) => {
    await logAction({
      action: 'EXPORT',
      tableName,
      metadata,
    });
  }, [logAction]);

  /**
   * Log a download action
   */
  const logDownload = useCallback(async (
    tableName: string,
    recordId: string,
    metadata?: Record<string, any>
  ) => {
    await logAction({
      action: 'DOWNLOAD',
      tableName,
      recordId,
      metadata,
    });
  }, [logAction]);

  /**
   * Log a submit action
   */
  const logSubmit = useCallback(async (
    tableName: string,
    recordId: string,
    newData?: Record<string, any>
  ) => {
    await logAction({
      action: 'SUBMIT',
      tableName,
      recordId,
      newData,
    });
  }, [logAction]);

  /**
   * Log an approve action
   */
  const logApprove = useCallback(async (
    tableName: string,
    recordId: string,
    metadata?: Record<string, any>
  ) => {
    await logAction({
      action: 'APPROVE',
      tableName,
      recordId,
      metadata,
    });
  }, [logAction]);

  /**
   * Log a reject action
   */
  const logReject = useCallback(async (
    tableName: string,
    recordId: string,
    metadata?: Record<string, any>
  ) => {
    await logAction({
      action: 'REJECT',
      tableName,
      recordId,
      metadata,
    });
  }, [logAction]);

  /**
   * Log an assign action
   */
  const logAssign = useCallback(async (
    tableName: string,
    recordId: string,
    metadata?: Record<string, any>
  ) => {
    await logAction({
      action: 'ASSIGN',
      tableName,
      recordId,
      metadata,
    });
  }, [logAction]);

  /**
   * Log a complete action
   */
  const logComplete = useCallback(async (
    tableName: string,
    recordId: string,
    metadata?: Record<string, any>
  ) => {
    await logAction({
      action: 'COMPLETE',
      tableName,
      recordId,
      metadata,
    });
  }, [logAction]);

  /**
   * Log an archive action
   */
  const logArchive = useCallback(async (
    tableName: string,
    recordId: string,
    metadata?: Record<string, any>
  ) => {
    await logAction({
      action: 'ARCHIVE',
      tableName,
      recordId,
      metadata,
    });
  }, [logAction]);

  /**
   * Log a send action (for notifications, emails, SMS)
   */
  const logSend = useCallback(async (
    tableName: string,
    recordId: string,
    metadata?: Record<string, any>
  ) => {
    await logAction({
      action: 'SEND',
      tableName,
      recordId,
      metadata,
    });
  }, [logAction]);

  return {
    logAction,
    logView,
    logCreate,
    logUpdate,
    logDelete,
    logExport,
    logDownload,
    logSubmit,
    logApprove,
    logReject,
    logAssign,
    logComplete,
    logArchive,
    logSend,
  };
}

/**
 * Standalone function for logging actions without the hook
 * Useful in edge functions or outside React components
 */
export async function logAuditAction(params: AuditLogParams & { 
  userId?: string; 
  userEmail?: string;
}): Promise<void> {
  try {
    const { action, tableName, recordId, oldData, newData, metadata, userId, userEmail } = params;
    
    const enrichedNewData = metadata 
      ? { ...newData, _metadata: metadata }
      : newData;

    const { error } = await supabase.from('audit_logs').insert({
      user_id: userId || null,
      user_email: userEmail || null,
      action,
      table_name: tableName,
      record_id: recordId || null,
      old_data: oldData || null,
      new_data: enrichedNewData || null,
    });

    if (error) {
      logger.error('Failed to log standalone audit action', error);
    }
  } catch (err) {
    logger.error('Standalone audit logging error', err);
  }
}
