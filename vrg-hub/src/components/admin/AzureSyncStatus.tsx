import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Cloud, RefreshCw, CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

interface SyncJob {
  id: string;
  status: string;
  progress: any;
  users_synced?: number;
  users_created?: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export function AzureSyncStatus() {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [lastSync, setLastSync] = useState<SyncJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<any>(null);
  const syncPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isAdmin = userRole === 'super_admin' || userRole === 'tenant_admin';

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (syncPollIntervalRef.current) {
        clearInterval(syncPollIntervalRef.current);
      }
    };
  }, []);

  const fetchLastSync = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('office365_sync_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching last sync:', error);
      } else {
        const job = data as SyncJob | null;
        
        // Check if job is stale (running for more than 15 minutes)
        if (job && (job.status === 'running' || job.status === 'starting')) {
          const jobAge = Date.now() - new Date(job.created_at).getTime();
          const FIFTEEN_MINUTES = 15 * 60 * 1000;
          
          if (jobAge > FIFTEEN_MINUTES) {
            // Mark stale job as failed
            await supabase
              .from('office365_sync_jobs')
              .update({ 
                status: 'failed', 
                error_message: 'Sync timed out - job was stuck in running state',
                completed_at: new Date().toISOString()
              })
              .eq('id', job.id);
            
            job.status = 'failed';
            job.error_message = 'Sync timed out - job was stuck in running state';
            setLastSync(job);
          } else {
            setLastSync(job);
            setSyncing(true);
            setSyncStatus(job.status);
            pollSyncStatus(job.id);
          }
        } else {
          setLastSync(job);
        }
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchLastSync();
    } else {
      setLoading(false);
    }
  }, [isAdmin, fetchLastSync]);

  const getTenantCompanyId = async (): Promise<string | null> => {
    const { data } = await supabase
      .from('synced_office365_users')
      .select('company_id')
      .limit(1)
      .maybeSingle();
    return (data as any)?.company_id ?? null;
  };

  const pollSyncStatus = useCallback((jobId: string) => {
    if (syncPollIntervalRef.current) {
      clearInterval(syncPollIntervalRef.current);
    }

    const pollInterval = setInterval(async () => {
      try {
        const { data: job, error } = await supabase
          .from('office365_sync_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error) {
          clearInterval(pollInterval);
          syncPollIntervalRef.current = null;
          setSyncing(false);
          return;
        }

        setSyncStatus(job.status);
        setSyncProgress(job.progress);

        if (job.status === 'completed') {
          clearInterval(pollInterval);
          syncPollIntervalRef.current = null;
          setSyncing(false);
          setLastSync(job as SyncJob);
          queryClient.invalidateQueries({ queryKey: ['enhanced-unified-users'] });
          toast.success(
            `Sync complete: ${job.users_synced ?? 0} users synced${job.users_created ? `, ${job.users_created} new` : ''}`
          );
        } else if (job.status === 'failed') {
          clearInterval(pollInterval);
          syncPollIntervalRef.current = null;
          setSyncing(false);
          setLastSync(job as SyncJob);
          toast.error(`Sync failed: ${job.error_message || 'Unknown error'}`);
        }
      } catch (err) {
        clearInterval(pollInterval);
        syncPollIntervalRef.current = null;
        setSyncing(false);
      }
    }, 2000);

    syncPollIntervalRef.current = pollInterval;

    // Timeout after 10 minutes
    setTimeout(async () => {
      if (!syncPollIntervalRef.current) return;

      clearInterval(syncPollIntervalRef.current);
      syncPollIntervalRef.current = null;

      try {
        await supabase
          .from('office365_sync_jobs')
          .update({
            status: 'failed',
            error_message: 'Sync timed out',
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId);
      } catch {
        // ignore
      }

      setSyncing(false);
      toast.error('Sync timed out');
    }, 600000);
  }, [queryClient]);

  const startSync = async () => {
    setSyncing(true);
    setSyncStatus('starting');
    setSyncProgress(null);

    try {
      // Get company ID
      let companyId: string | null = null;
      const { data: conn } = await supabase
        .from('office365_connections')
        .select('company_id')
        .eq('user_id', user?.id || '')
        .maybeSingle();

      companyId = (conn as any)?.company_id || (await getTenantCompanyId());

      if (!companyId) {
        toast.error('No Office 365 connection found. Connect in Settings → Integrations.');
        setSyncing(false);
        return;
      }

      setSyncStatus('running');

      const { data, error } = await supabase.functions.invoke('office365-sync-data', {
        body: { company_id: companyId }
      });

      if (error) throw error;

      const jobId = (data as any)?.job_id;
      if (!jobId) {
        throw new Error('No job ID returned');
      }

      toast.success('Sync started...');
      pollSyncStatus(jobId);
    } catch (err: any) {
      console.error('Sync error:', err);
      toast.error(err.message || 'Failed to start sync');
      setSyncing(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3 animate-pulse">
            <div className="h-8 w-8 bg-muted rounded" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-3 w-32 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getProgressPercent = () => {
    if (!syncProgress) return 0;
    if (typeof syncProgress === 'object') {
      return syncProgress.percent || syncProgress.progress || 0;
    }
    return 0;
  };

  return (
    <Card className="col-span-2">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Cloud className="h-8 w-8 text-blue-500" />
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">Azure AD Sync</p>
                {lastSync?.status === 'completed' && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Synced
                  </Badge>
                )}
                {lastSync?.status === 'failed' && (
                  <Badge variant="outline" className="text-red-600 border-red-600">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Failed
                  </Badge>
                )}
              </div>
              {lastSync ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last sync: {formatDistanceToNow(new Date(lastSync.created_at), { addSuffix: true })}
                  {lastSync.users_synced !== undefined && (
                    <span className="ml-1">({lastSync.users_synced} users)</span>
                  )}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">No sync history</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {syncing && (
              <div className="flex items-center gap-2 min-w-[120px]">
                <Progress value={getProgressPercent()} className="h-2 w-20" />
                <span className="text-xs text-muted-foreground capitalize">{syncStatus}</span>
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={startSync}
              disabled={syncing}
              className="gap-2"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
