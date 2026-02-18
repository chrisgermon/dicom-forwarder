import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useCallback, useRef } from 'react';

export interface Request {
  id: string;
  request_number?: number;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  assigned_to?: string | null;
  assigned_group_id?: string | null;
  source?: string;
  assigned_profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  request_types?: {
    name: string;
  };
}

interface UseRequestsOptions {
  filterType?: 'all' | 'my-requests' | 'pending';
  /** Filter by ticket source: hardware_request, or ticket/form */
  sourceFilter?: 'all' | 'hardware' | 'ticket';
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

interface UseRequestsResult {
  requests: Request[];
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  refetch: () => void;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function useRequests({
  filterType = 'all',
  sourceFilter = 'all',
  page = 1,
  pageSize = 50,
  enabled = true,
}: UseRequestsOptions = {}): UseRequestsResult {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ['requests', filterType, sourceFilter, page, pageSize, user?.id];

  const { data, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const listColumns = [
        'id', 'request_number', 'title', 'status', 'priority', 'created_at', 'updated_at',
        'user_id', 'assigned_to', 'assigned_group_id', 'request_type_id', 'source',
      ].join(', ');
      let query = supabase
        .from('tickets')
        .select(`${listColumns}, request_types:request_type_id(name)`, { count: 'exact' });

      // Apply filters based on tab
      if (filterType === 'my-requests') {
        query = query.eq('user_id', user?.id);
      } else if (filterType === 'pending') {
        const isManagerOrAdmin = ['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(userRole || '');
        if (isManagerOrAdmin) {
          query = query.eq('status', 'open');
        }
      }
      if (sourceFilter === 'hardware') {
        query = query.eq('source', 'hardware_request');
      } else if (sourceFilter === 'ticket') {
        query = query.in('source', ['ticket', 'form']);
      }

      // Apply pagination and ordering
      query = query
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      const baseRequests = (data || []) as unknown as Request[];

      // Hydrate assigned user's display info (best-effort; don't fail list if restricted)
      const assignedIds = Array.from(
        new Set(baseRequests.map((r) => r.assigned_to).filter(Boolean))
      ) as string[];

      let profilesById: Record<string, { id: string; full_name: string | null; email: string | null }> = {};

      if (assignedIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', assignedIds);

        if (!profilesError && profilesData) {
          profilesById = Object.fromEntries(
            profilesData.map((p) => [p.id, { id: p.id, full_name: (p as any).full_name ?? null, email: (p as any).email ?? null }])
          );
        }
      }

      const requestsWithProfiles: Request[] = baseRequests.map((r) => ({
        ...r,
        assigned_profile: r.assigned_to ? profilesById[r.assigned_to] ?? null : null,
      }));

      return {
        requests: requestsWithProfiles,
        totalCount: count || 0,
      };
    },
    enabled: enabled && !!user?.id,
  });

  // Debounce realtime updates to prevent rapid-fire refetches
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleRealtimeChange = useCallback(() => {
    // Debounce invalidation - wait 1 second before refetching
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    }, 1000);
  }, [queryClient]);

  // Subscribe to realtime updates on the tickets table
  useRealtimeSubscription({
    table: 'tickets',
    event: '*',
    onChange: handleRealtimeChange,
    enabled: enabled && !!user?.id,
  });

  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    requests: data?.requests || [],
    isLoading,
    isRefetching,
    error: error as Error | null,
    refetch,
    totalCount,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
