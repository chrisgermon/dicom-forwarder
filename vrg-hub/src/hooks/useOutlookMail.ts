import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MailFolder {
  id: string;
  displayName: string;
  parentFolderId: string | null;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
}

export interface EmailAddress {
  name: string;
  address: string;
}

export interface MailMessage {
  id: string;
  subject: string;
  bodyPreview: string;
  body?: { content: string; contentType: string };
  from: { emailAddress: EmailAddress };
  toRecipients: { emailAddress: EmailAddress }[];
  ccRecipients?: { emailAddress: EmailAddress }[];
  receivedDateTime: string;
  sentDateTime?: string;
  isRead: boolean;
  hasAttachments: boolean;
  importance: string;
  flag: { flagStatus: string };
  webLink: string;
  attachments?: any[];
}

async function callOutlookMail(action: string, params: Record<string, any> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await supabase.functions.invoke('outlook-mail', {
    body: { action, ...params },
  });

  if (response.error) {
    throw new Error(response.error.message || 'Failed to call outlook-mail');
  }

  if (response.data?.error) {
    throw new Error(response.data.error);
  }

  return response.data;
}

export function useMailFolders() {
  return useQuery({
    queryKey: ['outlook-mail-folders'],
    queryFn: async () => {
      const data = await callOutlookMail('getFolders');
      return data.folders as MailFolder[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useMailMessages(folderId: string = 'inbox', search?: string) {
  return useQuery({
    queryKey: ['outlook-mail-messages', folderId, search],
    queryFn: async () => {
      const data = await callOutlookMail('getMessages', { 
        folderId, 
        top: 50,
        search 
      });
      return data.messages as MailMessage[];
    },
    staleTime: 30 * 1000,
  });
}

export function useMailMessage(messageId: string | null) {
  return useQuery({
    queryKey: ['outlook-mail-message', messageId],
    queryFn: async () => {
      if (!messageId) return null;
      const data = await callOutlookMail('getMessage', { messageId });
      return data.message as MailMessage;
    },
    enabled: !!messageId,
    staleTime: 60 * 1000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['outlook-mail-unread'],
    queryFn: async () => {
      const data = await callOutlookMail('getUnreadCount');
      return data as { unreadCount: number; totalCount: number };
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      await callOutlookMail('markAsRead', { messageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlook-mail-messages'] });
      queryClient.invalidateQueries({ queryKey: ['outlook-mail-unread'] });
    },
  });
}
