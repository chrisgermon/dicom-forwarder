import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Cloud,
  RefreshCw,
  UserPlus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Link as LinkIcon,
  Unlink,
  Users,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';

interface Office365Connection {
  id: string;
  connected: boolean;
  last_sync: string | null;
  sync_enabled: boolean;
}

interface Office365User {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  department?: string;
  hasLicense: boolean;
}

export function Office365UserSync() {
  const { user, userRole } = useAuth();
  const [connection, setConnection] = useState<Office365Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [, setSyncJobId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<any>(null);
  const [office365Users, setOffice365Users] = useState<Office365User[]>([]);
  const [selectedUser, setSelectedUser] = useState<Office365User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('requester');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [showUnlicensed, setShowUnlicensed] = useState<boolean>(false);
  const [sortByLicense, setSortByLicense] = useState<'asc' | 'desc' | null>(null);
  const [directQuery, setDirectQuery] = useState('');
  const [directLoading, setDirectLoading] = useState(false);
  const [directResults, setDirectResults] = useState<Office365User[] | null>(null);
  const [syncingUsers, setSyncingUsers] = useState<Set<string>>(new Set());
  const usersPerPage = 20;
  const syncPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (syncPollIntervalRef.current) {
        clearInterval(syncPollIntervalRef.current);
      }
    };
  }, []);

  const isAdmin = userRole === 'super_admin' || userRole === 'tenant_admin';

  // Get unique roles and departments for filters
  const uniqueRoles = useMemo(() => {
    const roles = office365Users
      .map(u => u.jobTitle)
      .filter((title): title is string => !!title);
    return Array.from(new Set(roles)).sort();
  }, [office365Users]);

  const uniqueDepartments = useMemo(() => {
    const depts = office365Users
      .map(u => u.department)
      .filter((dept): dept is string => !!dept);
    return Array.from(new Set(depts)).sort();
  }, [office365Users]);

  // Memoize filtered and paginated users for performance
  const filteredUsers = useMemo(() => {
    const filtered = office365Users.filter(user => {
      // Search filter
      const matchesSearch = 
        user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.mail && user.mail.toLowerCase().includes(searchQuery.toLowerCase())) ||
        user.userPrincipalName.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Role filter
      const matchesRole = filterRole === 'all' || user.jobTitle === filterRole;
      
      // Department filter
      const matchesDepartment = filterDepartment === 'all' || user.department === filterDepartment;

      // License filter (default hide unlicensed)
      const matchesLicense = showUnlicensed || user.hasLicense;
      
      return matchesSearch && matchesRole && matchesDepartment && matchesLicense;
    });

    // Apply license sorting if active
    if (sortByLicense) {
      return [...filtered].sort((a, b) => {
        if (sortByLicense === 'asc') {
          return (a.hasLicense ? 0 : 1) - (b.hasLicense ? 0 : 1);
        } else {
          return (b.hasLicense ? 0 : 1) - (a.hasLicense ? 0 : 1);
        }
      });
    }

    return filtered;
  }, [office365Users, searchQuery, filterRole, filterDepartment, showUnlicensed, sortByLicense]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage, usersPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredUsers.length / usersPerPage);
  }, [filteredUsers.length, usersPerPage]);

  const handleDirectSearch = useCallback(async () => {
    if (!directQuery.trim()) {
      setDirectResults(null);
      return;
    }
    setDirectLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('office365-user-search', { body: { q: directQuery.trim() } });
      if (error) throw error as any;
      const results = (data?.results || []) as any[];
      const mapped: Office365User[] = results.map((u: any) => ({
        id: u.userPrincipalName,
        displayName: u.displayName,
        mail: u.mail,
        userPrincipalName: u.userPrincipalName,
        jobTitle: u.jobTitle,
        department: u.department,
        hasLicense: !!u.hasLicense,
      }));
      setDirectResults(mapped);
    } catch (e) {
      console.error('Direct O365 search failed:', e);
      toast.error('Direct Office 365 search failed');
      setDirectResults(null);
    } finally {
      setDirectLoading(false);
    }
  }, [directQuery]);

  const getTenantCompanyId = useCallback(async (): Promise<string | null> => {
    try {
      const { data, error } = await (supabase as any)
        .from('synced_office365_users')
        .select('company_id')
        .limit(1)
        .maybeSingle();

      if (error) {
        logger.error('Error fetching tenant company ID', error);
        return null;
      }

      return data?.company_id ?? null;
    } catch (error) {
      logger.error('Unexpected error fetching tenant company ID', error);
      toast.error('Failed to load company information');
      return null;
    }
  }, []);

  const loadUsers = useCallback(async (companyIdParam?: string) => {
    try {
      const companyId = companyIdParam || (await getTenantCompanyId());
      if (!companyId) {
        setOffice365Users([]);
        return;
      }
      const { data: syncedUsers, error: queryError } = await (supabase as any)
        .from('synced_office365_users')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('display_name');
      if (queryError) {
        logger.error('Error loading synced users', queryError);
        toast.error('Failed to load synced users');
        setOffice365Users([]);
        return;
      }
      const users = (syncedUsers || []).map((u: any) => ({
        id: u.user_principal_name,
        displayName: u.display_name,
        mail: u.mail,
        userPrincipalName: u.user_principal_name,
        jobTitle: u.job_title,
        department: u.department,
        hasLicense: Array.isArray(u.assigned_licenses) && u.assigned_licenses.length > 0,
      }));
      setOffice365Users(users);
    } catch (error) {
      logger.error('Unexpected error loading users', error);
      toast.error('An unexpected error occurred');
      setOffice365Users([]);
    }
  }, [getTenantCompanyId]);

  const checkConnection = useCallback(async () => {
    setLoading(true);
    try {
      // Try to find a connection for this user (may be restricted by RLS)
      const { data: conn, error } = await ((supabase as any)
        .from('office365_connections')
        .select('id, updated_at, company_id')
        .eq('user_id', user?.id || '')
        .order('updated_at', { ascending: false })
        .maybeSingle());

      if (!error && conn) {
        setConnection({
          id: (conn as any).id,
          connected: true,
          last_sync: (conn as any).updated_at,
          sync_enabled: true,
        });
        // Preload users for this company
        await loadUsers((conn as any).company_id);
      } else {
        // Fallback: infer connectivity from existing synced users (tenant-wide)
        const companyId = await getTenantCompanyId();
        if (companyId) {
          setConnection({ id: 'tenant', connected: true, last_sync: null, sync_enabled: true });
          await loadUsers(companyId);
        } else {
          setConnection({ id: '1', connected: false, last_sync: null, sync_enabled: false });
        }
      }
    } catch (error) {
      logger.error('Error checking Office 365 connection', error);
      setConnection({ id: '1', connected: false, last_sync: null, sync_enabled: false });
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadUsers, getTenantCompanyId]);

  useEffect(() => {
    if (isAdmin) {
      checkConnection();
    }
  }, [isAdmin, checkConnection]);

  const connectOffice365 = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in again to connect Office 365');
        return;
      }

      // Use a default company_id or get it from the user context
      // For now, we'll pass it in the state and retrieve it later
      const company_id = 'default'; // This will be stored in the oauth state

      const { data, error } = await supabase.functions.invoke('office365-oauth-initiate', {
        body: { company_id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      
      if (error) {
        console.error('OAuth initiate error:', error);
        throw error;
      }

      if (data?.authorization_url) {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          data.authorization_url,
          'office365-auth',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
          toast.error('Please allow popups for this site to connect Office 365');
          return;
        }

        let connectionCheckInterval: NodeJS.Timeout | null = null;
        
        const checkConnectionStatus = async () => {
          const { data: conn } = await supabase
            .from('office365_connections')
            .select('id, updated_at')
            .eq('user_id', user?.id || '')
            .order('updated_at', { ascending: false })
            .maybeSingle();

          if (conn) {
            toast.success('Office 365 connected successfully');
            if (connectionCheckInterval) clearInterval(connectionCheckInterval);
            try { popup?.close(); } catch {}
            checkConnection();
          }
        };

        // Poll for connection status
        connectionCheckInterval = setInterval(checkConnectionStatus, 2000);

        const poll = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(poll);
            if (connectionCheckInterval) clearInterval(connectionCheckInterval);
            // Check one final time in case connection was made
            setTimeout(checkConnectionStatus, 1000);
          }
        }, 500);
      }
    } catch (error) {
      console.error('Error connecting Office 365:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect Office 365');
    }
  };

  const disconnectOffice365 = async () => {
    try {
      // Implement disconnect logic
      toast.success('Office 365 disconnected');
      setConnection({ ...connection!, connected: false });
    } catch (error) {
      console.error('Error disconnecting Office 365:', error);
      toast.error('Failed to disconnect Office 365');
    }
  };

  const pollSyncStatus = useCallback(async (jobId: string, companyId: string) => {
    // Clear any existing interval
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
          console.error('Error polling sync job:', error);
          if (syncPollIntervalRef.current) {
            clearInterval(syncPollIntervalRef.current);
            syncPollIntervalRef.current = null;
          }
          setSyncing(false);
          toast.error('Failed to check sync status');
          return;
        }

        setSyncStatus(job.status);
        setSyncProgress(job.progress);

        if (job.status === 'completed') {
          if (syncPollIntervalRef.current) {
            clearInterval(syncPollIntervalRef.current);
            syncPollIntervalRef.current = null;
          }
          setSyncing(false);
          setSyncJobId(null);
          
          // Refresh the list
          await loadUsers(companyId);

          const synced = job.users_synced ?? 0;
          const created = job.users_created ?? 0;
          toast.success(
            `Sync complete: ${synced} users synced${created ? `, ${created} new accounts created` : ''}`
          );

          // Update last sync time
          setConnection(prev => prev ? {
            ...prev,
            last_sync: new Date().toISOString()
          } : null);
        } else if (job.status === 'failed') {
          if (syncPollIntervalRef.current) {
            clearInterval(syncPollIntervalRef.current);
            syncPollIntervalRef.current = null;
          }
          setSyncing(false);
          setSyncJobId(null);
          toast.error(`Sync failed: ${job.error_message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error in polling:', error);
        if (syncPollIntervalRef.current) {
          clearInterval(syncPollIntervalRef.current);
          syncPollIntervalRef.current = null;
        }
        setSyncing(false);
      }
    }, 2000); // Poll every 2 seconds

    syncPollIntervalRef.current = pollInterval;

    // Cleanup after 10 minutes maximum
    setTimeout(() => {
      if (!syncPollIntervalRef.current) return;
      clearInterval(syncPollIntervalRef.current);
      syncPollIntervalRef.current = null;
      setSyncing(false);
      toast.error('Sync timed out');
    }, 600000);
  }, [syncing, loadUsers]);

  const syncUsers = async () => {
    if (!connection?.connected) {
      toast.error('Please connect Office 365 first');
      return;
    }

    setSyncing(true);
    setSyncStatus('starting');
    setSyncProgress(null);

    try {
      // Try to read the current user's connection for company_id (may be blocked by RLS)
      let companyId: string | null = null;

      const { data: conn } = await (supabase as any)
        .from('office365_connections')
        .select('company_id')
        .eq('user_id', user?.id || '')
        .maybeSingle();

      companyId = conn?.company_id || (await getTenantCompanyId());

      if (!companyId) {
        toast.error('No Office 365 connection found for this tenant. A Super Admin must connect it in Integrations.');
        setSyncing(false);
        return;
      }

      setSyncStatus('running');

      // Call the sync function (returns immediately with job ID)
      const { data, error } = await supabase.functions.invoke('office365-sync-data', {
        body: {
          company_id: companyId,
          // Keep sync fast/reliable; user accounts can be created via Import.
          create_auth_users: false,
        }
      });

      if (error) throw error;

      // Start polling for job status
      const jobId = (data as any)?.job_id;
      if (!jobId) {
        throw new Error('No job ID returned from sync');
      }

      setSyncJobId(jobId);
      toast.success('Sync started. Polling for status...');

      // Start polling for status updates
      pollSyncStatus(jobId, companyId);
    } catch (error) {
      console.error('Error syncing users:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sync Office 365 users');
      setSyncing(false);
      setSyncStatus(null);
    }
  };

  const importUser = async () => {
    if (!selectedUser) return;

    try {
      const companyId = await getTenantCompanyId();
      if (!companyId) {
        toast.error('Could not determine company ID');
        return;
      }

      // Get the full user data from synced users
      const { data: syncedUser } = await (supabase as any)
        .from('synced_office365_users')
        .select('*')
        .eq('company_id', companyId)
        .eq('user_principal_name', selectedUser.id)
        .single();

      if (!syncedUser) {
        toast.error('User not found in synced users');
        return;
      }

      const { error } = await supabase.functions.invoke('import-office365-user', {
        body: {
          o365User: {
            id: syncedUser.user_principal_name,
            mail: syncedUser.mail,
            display_name: syncedUser.display_name,
            job_title: syncedUser.job_title,
            department: syncedUser.department,
            office_location: syncedUser.office_location,
            business_phones: syncedUser.business_phones,
            mobile_phone: syncedUser.mobile_phone,
          },
          role: selectedRole,
          companyId,
        }
      });

      if (error) throw error;

      toast.success(`User ${selectedUser.displayName} imported successfully`);
      setImportDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error importing user:', error);
      toast.error('Failed to import user');
    }
  };

  const syncSingleUser = async (userId: string) => {
    try {
      const companyId = await getTenantCompanyId();
      if (!companyId) {
        toast.error('Could not determine company ID');
        return false;
      }

      setSyncingUsers(prev => new Set(prev).add(userId));
      
      const { data, error } = await supabase.functions.invoke('office365-sync-single-user', {
        body: { userId, companyId }
      });

      if (error) throw error;

      toast.success(data.message || 'User synced successfully');
      
      // Reload synced users
      await loadUsers();
      
      return true;
    } catch (error) {
      console.error('Error syncing single user:', error);
      toast.error('Failed to sync user from Office 365');
      return false;
    } finally {
      setSyncingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const syncAndImportUser = async (user: Office365User) => {
    const synced = await syncSingleUser(user.id);
    if (synced) {
      // Open import dialog after successful sync
      setSelectedUser(user);
      setImportDialogOpen(true);
    }
  };

  const bulkImportUsers = async () => {
    if (!confirm(`Import all ${office365Users.length} synced users as inactive "requester" accounts? They will be activated when they first sign in.`)) {
      return;
    }

    setBulkImporting(true);
    setImportProgress(0);
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    try {
      const companyId = await getTenantCompanyId();
      if (!companyId) {
        toast.error('Could not determine company ID');
        setBulkImporting(false);
        return;
      }

      const totalUsers = office365Users.length;

      for (let i = 0; i < totalUsers; i++) {
        const o365User = office365Users[i];
        try {
          const { data: syncedUser } = await (supabase as any)
            .from('synced_office365_users')
            .select('*')
            .eq('company_id', companyId)
            .eq('user_principal_name', o365User.id)
            .single();

          if (!syncedUser) {
            errorCount++;
            continue;
          }

          const { data, error } = await supabase.functions.invoke('import-office365-user', {
            body: {
              o365User: {
                id: syncedUser.user_principal_name,
                mail: syncedUser.mail,
                display_name: syncedUser.display_name,
                job_title: syncedUser.job_title,
                department: syncedUser.department,
                office_location: syncedUser.office_location,
                business_phones: syncedUser.business_phones,
                mobile_phone: syncedUser.mobile_phone,
              },
              role: 'requester',
              companyId,
            }
          });

          if (error) {
            console.error(`Failed to import ${o365User.displayName}:`, error);
            errorCount++;
          } else if (data?.skipped) {
            skippedCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`Error processing ${o365User.displayName}:`, err);
          errorCount++;
        }

        // Update progress
        const progress = Math.round(((i + 1) / totalUsers) * 100);
        setImportProgress(progress);
      }

      toast.success(`Import complete: ${successCount} imported, ${skippedCount} already existed${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
    } catch (error) {
      console.error('Bulk import error:', error);
      toast.error('Bulk import failed');
    } finally {
      setBulkImporting(false);
      setImportProgress(0);
    }
  };

  if (!isAdmin) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to manage Office 365 integration.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Office 365 / Azure AD Integration
              </CardTitle>
              <CardDescription>
                Sync users from your Office 365 / Azure AD directory
              </CardDescription>
            </div>
            <Badge variant={connection?.connected ? 'default' : 'outline'}>
              {connection?.connected ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Connected
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Connection Status</p>
              <p className="text-sm text-muted-foreground">
                {connection?.connected 
                  ? `Last synced: ${connection.last_sync ? new Date(connection.last_sync).toLocaleString() : 'Never'}`
                  : 'Connect to Office 365 to sync users'
                }
              </p>
            </div>
            <div className="flex gap-2">
              {connection?.connected ? (
                <>
                  <Button
                    variant="outline"
                    onClick={syncUsers}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync Users
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={disconnectOffice365}
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button onClick={connectOffice365}>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Connect Office 365
                </Button>
              )}
            </div>
          </div>

          {/* Sync Progress Display */}
          {syncing && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Sync Status: {syncStatus === 'starting' ? 'Starting...' : syncStatus === 'running' ? 'Running...' : syncStatus}
                </span>
                {syncStatus === 'running' && syncProgress && (
                  <span className="text-sm text-muted-foreground">
                    {syncProgress.users_synced || 0} users processed
                  </span>
                )}
              </div>
              {syncStatus === 'running' && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Syncing users and mailboxes from Office 365...
                    </span>
                  </div>
                  {syncProgress && (
                    <div className="text-xs text-muted-foreground space-y-1 mt-2">
                      <div>Users synced: {syncProgress.users_synced || 0}</div>
                      <div>Users created: {syncProgress.users_created || 0}</div>
                      <div>Users skipped: {syncProgress.users_skipped || 0}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {office365Users.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Office 365 Users ({office365Users.length})</CardTitle>
                <CardDescription>
                  Import users from your Office 365 directory
                </CardDescription>
              </div>
              <Button 
                onClick={bulkImportUsers} 
                disabled={bulkImporting}
                variant="default"
              >
                {bulkImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Import All Users
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {bulkImporting && importProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Importing users...</span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} />
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Search by name, email, or UPN..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <Select value={filterRole} onValueChange={(value) => {
                setFilterRole(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {uniqueRoles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterDepartment} onValueChange={(value) => {
                setFilterDepartment(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {uniqueDepartments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 pl-1">
                <Switch id="show-unlicensed" checked={showUnlicensed} onCheckedChange={(v) => {
                  setShowUnlicensed(!!v);
                  setCurrentPage(1);
                }} />
                <label htmlFor="show-unlicensed" className="text-sm">Show unlicensed</label>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input 
                  placeholder="Direct Office 365 search (name/email/UPN)"
                  value={directQuery}
                  onChange={(e) => setDirectQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleDirectSearch(); }}
                  className="w-full sm:w-[320px]"
                />
                <Button onClick={handleDirectSearch} disabled={directLoading} variant="secondary">
                  {directLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Search
                </Button>
              </div>
            </div>

            {directResults && (
              <div className="mb-4">
                <div className="text-sm text-muted-foreground mb-2">Live Office 365 results ({directResults.length})</div>
            <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>License</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {directResults.map((u) => (
                      <TableRow key={`live-${u.id}`}>
                        <TableCell className="font-medium">{u.displayName}</TableCell>
                        <TableCell>{u.mail || u.userPrincipalName}</TableCell>
                        <TableCell className="text-muted-foreground">{u.jobTitle || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{u.department || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={u.hasLicense ? 'default' : 'secondary'}>{u.hasLicense ? 'Licensed' : 'Unlicensed'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => syncAndImportUser(u)}
                            disabled={syncingUsers.has(u.id)}
                          >
                            {syncingUsers.has(u.id) ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Syncing...
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Sync & Import
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => setSortByLicense(prev => 
                      prev === null ? 'desc' : prev === 'desc' ? 'asc' : null
                    )}
                  >
                    License {sortByLicense && (sortByLicense === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((o365User) => (
                  <TableRow key={o365User.id}>
                    <TableCell className="font-medium">
                      {o365User.displayName}
                    </TableCell>
                    <TableCell>{o365User.mail || o365User.userPrincipalName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {o365User.jobTitle || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {o365User.department || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={o365User.hasLicense ? "default" : "secondary"}
                      >
                        {o365User.hasLicense ? 'Licensed' : 'Unlicensed'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(o365User);
                          setImportDialogOpen(true);
                        }}
                        disabled={bulkImporting}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Import
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {(() => {
              if (totalPages <= 1) return null;
              
              return (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pageNum)}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              );
            })()}
          </CardContent>
        </Card>
      )}

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Office 365 User</DialogTitle>
            <DialogDescription>
              Select a role for {selectedUser?.displayName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">User Details</label>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Name: {selectedUser?.displayName}</p>
                <p>Email: {selectedUser?.mail || selectedUser?.userPrincipalName}</p>
                {selectedUser?.jobTitle && <p>Job Title: {selectedUser.jobTitle}</p>}
                {selectedUser?.department && <p>Department: {selectedUser.department}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requester">Requester</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="marketing_manager">Marketing Manager</SelectItem>
                  <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                  {userRole === 'super_admin' && (
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={importUser}>
              <UserPlus className="h-4 w-4 mr-2" />
              Import User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
