import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Eye, Search, ArrowUpDown, RefreshCw, Trash2, ChevronLeft, ChevronRight, Inbox, Plus, RotateCcw, Columns3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { formatAUDate } from '@/lib/dateUtils';
import { useAuth } from '@/hooks/useAuth';
import { useRequestDelete } from '@/hooks/useRequestDelete';
import { useRequests } from '@/hooks/useRequests';
import { RequestStatus } from '@/types/request';
import { formatRequestId } from '@/lib/requestUtils';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

// Column definitions for visibility toggle
const COLUMNS = [
  { id: 'id', label: 'ID', defaultVisible: true },
  { id: 'title', label: 'Title', defaultVisible: true },
  { id: 'type', label: 'Request Type', defaultVisible: true },
  { id: 'status', label: 'Status', defaultVisible: true },
  { id: 'priority', label: 'Priority', defaultVisible: true },
  { id: 'assigned', label: 'Assigned To', defaultVisible: true },
  { id: 'created', label: 'Created', defaultVisible: true },
  { id: 'updated', label: 'Last Updated', defaultVisible: false },
] as const;

type ColumnId = typeof COLUMNS[number]['id'];

const STORAGE_KEY = 'requests-list-columns';

interface RequestsListProps {
  onRequestSelect?: (requestId: string) => void;
  selectedRequestId?: string | null;
  filterType?: 'all' | 'my-requests' | 'pending';
}

export function RequestsList({ onRequestSelect, selectedRequestId, filterType = 'all' }: RequestsListProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { deleteRequests, isDeleting, canDelete } = useRequestDelete();

  // Read initial values from URL params
  const [page, setPage] = useState(() => {
    const p = searchParams.get('page');
    return p ? parseInt(p, 10) : 1;
  });
  const [pageSize, setPageSize] = useState<number>(() => {
    const ps = searchParams.get('pageSize');
    return ps ? parseInt(ps, 10) : 50;
  });
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'status'>(() => {
    const sort = searchParams.get('sortBy');
    return (sort === 'date' || sort === 'priority' || sort === 'status') ? sort : 'date';
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    const order = searchParams.get('sortOrder');
    return order === 'asc' ? 'asc' : 'desc';
  });
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Column visibility state - persisted to localStorage
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return new Set(JSON.parse(stored) as ColumnId[]);
      }
    } catch {
      // Ignore parse errors
    }
    return new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.id));
  });

  const toggleColumn = (columnId: ColumnId) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        // Don't allow hiding all columns - keep at least title
        if (next.size > 1 || columnId === 'title') {
          next.delete(columnId);
        }
      } else {
        next.add(columnId);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const isColumnVisible = (columnId: ColumnId) => visibleColumns.has(columnId);

  // Sync state changes to URL (debounced for search)
  const updateSearchParams = useCallback((updates: Record<string, string | null>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Update URL when filters change
  useEffect(() => {
    updateSearchParams({
      page: page > 1 ? String(page) : null,
      pageSize: pageSize !== 50 ? String(pageSize) : null,
      q: searchQuery || null,
      sortBy: sortBy !== 'date' ? sortBy : null,
      sortOrder: sortOrder !== 'desc' ? sortOrder : null,
    });
  }, [page, pageSize, searchQuery, sortBy, sortOrder, updateSearchParams]);

  // Use the new React Query based hook with realtime
  const {
    requests,
    isLoading,
    isRefetching,
    refetch,
    totalCount,
    hasNextPage,
    hasPreviousPage,
  } = useRequests({
    filterType,
    page,
    pageSize,
    enabled: !!user?.id,
  });

  // Handle page size change - reset to page 1
  const handlePageSizeChange = (newSize: string) => {
    setPageSize(Number(newSize));
    setPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery !== '' || sortBy !== 'date' || sortOrder !== 'desc' || page !== 1;

  // Reset all filters to defaults
  const handleResetFilters = () => {
    setSearchQuery('');
    setSortBy('date');
    setSortOrder('desc');
    setPage(1);
    setPageSize(50);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRequests(filteredAndSortedRequests.map(r => r.id));
    } else {
      setSelectedRequests([]);
    }
  };

  const handleSelectRequest = (requestId: string, checked: boolean) => {
    if (checked) {
      setSelectedRequests(prev => [...prev, requestId]);
    } else {
      setSelectedRequests(prev => prev.filter(id => id !== requestId));
    }
  };

  const handleDeleteSelected = async () => {
    const success = await deleteRequests(selectedRequests);
    if (success) {
      setShowDeleteDialog(false);
      setSelectedRequests([]);
      refetch();
    }
  };

  const getStatusBadge = (status: RequestStatus) => {
    const styles: Record<string, string> = {
      open: 'bg-blue-50 text-blue-700 border-blue-200',
      in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
      completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${styles[status] || styles.open}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      low: 'bg-slate-50 text-slate-600 border-slate-200',
      medium: 'bg-blue-50 text-blue-600 border-blue-200',
      high: 'bg-orange-50 text-orange-600 border-orange-200',
      urgent: 'bg-red-50 text-red-600 border-red-200',
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${styles[priority] || styles.medium}`}>
        {priority}
      </span>
    );
  };

  // Filter and sort requests (client-side for search, server handles pagination)
  const filteredAndSortedRequests = useMemo(() => {
    let filtered = [...requests];

    // Apply search filter (client-side)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((request) => {
        const requestId = request.request_number ? formatRequestId(request.request_number) : '';
        return (
          request.title.toLowerCase().includes(query) ||
          requestId.toLowerCase().includes(query) ||
          request.status.toLowerCase().includes(query) ||
          request.priority.toLowerCase().includes(query)
        );
      });
    }

    // Apply sorting (client-side for current page)
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'priority': {
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] || 0) - 
                      (priorityOrder[b.priority as keyof typeof priorityOrder] || 0);
          break;
        }
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [requests, searchQuery, sortBy, sortOrder]);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Calculate showing range
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  // Skeleton loading component
  const SkeletonRows = () => (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {canDelete && (
            <TableCell>
              <Skeleton className="h-4 w-4" />
            </TableCell>
          )}
          {isColumnVisible('id') && <TableCell><Skeleton className="h-4 w-16" /></TableCell>}
          {isColumnVisible('title') && <TableCell><Skeleton className="h-4 w-48" /></TableCell>}
          {isColumnVisible('type') && <TableCell><Skeleton className="h-4 w-24" /></TableCell>}
          {isColumnVisible('status') && <TableCell><Skeleton className="h-5 w-20" /></TableCell>}
          {isColumnVisible('priority') && <TableCell><Skeleton className="h-5 w-16" /></TableCell>}
          {isColumnVisible('assigned') && <TableCell><Skeleton className="h-4 w-28" /></TableCell>}
          {isColumnVisible('created') && <TableCell><Skeleton className="h-4 w-24" /></TableCell>}
          {isColumnVisible('updated') && <TableCell><Skeleton className="h-4 w-24" /></TableCell>}
          <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>All Requests</CardTitle>
          <span className="text-sm text-muted-foreground">
            {totalCount} total request{totalCount !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, ID, status, or priority..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {canDelete && selectedRequests.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete ({selectedRequests.length})
              </Button>
            )}
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date Created</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              <ArrowUpDown className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isRefetching}
              title="Refresh requests"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" title="Toggle columns">
                  <Columns3 className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {COLUMNS.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={isColumnVisible(column.id)}
                    onCheckedChange={() => toggleColumn(column.id)}
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                title="Reset all filters"
                className="text-muted-foreground"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {!isLoading && filteredAndSortedRequests.length === 0 ? (
          <EmptyState
            icon={<Inbox />}
            title={searchQuery ? 'No requests match your search' : 'No requests yet'}
            description={
              searchQuery
                ? 'Try adjusting your search terms or clearing the filter.'
                : 'Create your first request to get started tracking your work.'
            }
            action={
              !searchQuery
                ? {
                    label: 'Create Request',
                    onClick: () => navigate('/request/new'),
                    icon: <Plus className="w-4 h-4" />,
                  }
                : undefined
            }
          />
        ) : (
          <div className="rounded-md border">
            <Table resizable storageKey="requests-list">
              <TableHeader>
                <TableRow>
                  {canDelete && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedRequests.length === filteredAndSortedRequests.length && filteredAndSortedRequests.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                        disabled={isLoading}
                      />
                    </TableHead>
                  )}
                  {isColumnVisible('id') && <TableHead columnId="id">ID</TableHead>}
                  {isColumnVisible('title') && <TableHead columnId="title">Title</TableHead>}
                  {isColumnVisible('type') && <TableHead columnId="type">Request Type</TableHead>}
                  {isColumnVisible('status') && <TableHead columnId="status">Status</TableHead>}
                  {isColumnVisible('priority') && <TableHead columnId="priority">Priority</TableHead>}
                  {isColumnVisible('assigned') && <TableHead columnId="assigned">Assigned To</TableHead>}
                  {isColumnVisible('created') && <TableHead columnId="created">Created</TableHead>}
                  {isColumnVisible('updated') && <TableHead columnId="updated">Last Updated</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <SkeletonRows />
                ) : (
                  filteredAndSortedRequests.map((request) => {
                  const requestNum = request.request_number 
                    ? formatRequestId(request.request_number).toLowerCase()
                    : request.id;
                  return (
                    <TableRow 
                      key={request.id}
                      className={`transition-colors ${selectedRequestId === request.id ? 'bg-muted' : 'hover:bg-muted/50'}`}
                    >
                      {canDelete && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedRequests.includes(request.id)}
                            onCheckedChange={(checked) => handleSelectRequest(request.id, checked as boolean)}
                            aria-label={`Select request ${request.id}`}
                          />
                        </TableCell>
                      )}
                      {isColumnVisible('id') && (
                        <TableCell
                          className="font-mono text-xs cursor-pointer"
                          onClick={() => {
                            if (onRequestSelect) {
                              onRequestSelect(request.id);
                            } else {
                              navigate(`/request/${requestNum}`);
                            }
                          }}
                        >
                          {request.request_number ? formatRequestId(request.request_number) : 'N/A'}
                        </TableCell>
                      )}
                      {isColumnVisible('title') && (
                        <TableCell
                          className="font-medium cursor-pointer"
                          onClick={() => {
                            if (onRequestSelect) {
                              onRequestSelect(request.id);
                            } else {
                              navigate(`/request/${requestNum}`);
                            }
                          }}
                        >
                          {request.title}
                        </TableCell>
                      )}
                      {isColumnVisible('type') && (
                        <TableCell
                          className="cursor-pointer"
                          onClick={() => {
                            if (onRequestSelect) {
                              onRequestSelect(request.id);
                            } else {
                              navigate(`/request/${requestNum}`);
                            }
                          }}
                        >
                          {request.request_types?.name || '-'}
                        </TableCell>
                      )}
                      {isColumnVisible('status') && (
                        <TableCell
                          className="cursor-pointer"
                          onClick={() => {
                            if (onRequestSelect) {
                              onRequestSelect(request.id);
                            } else {
                              navigate(`/request/${requestNum}`);
                            }
                          }}
                        >
                          {getStatusBadge(request.status as RequestStatus)}
                        </TableCell>
                      )}
                      {isColumnVisible('priority') && (
                        <TableCell
                          className="cursor-pointer"
                          onClick={() => {
                            if (onRequestSelect) {
                              onRequestSelect(request.id);
                            } else {
                              navigate(`/request/${requestNum}`);
                            }
                          }}
                        >
                          {getPriorityBadge(request.priority)}
                        </TableCell>
                      )}
                      {isColumnVisible('assigned') && (
                        <TableCell
                          className="cursor-pointer"
                          onClick={() => {
                            if (onRequestSelect) {
                              onRequestSelect(request.id);
                            } else {
                              navigate(`/request/${requestNum}`);
                            }
                          }}
                        >
                          {request.assigned_profile?.full_name ||
                            request.assigned_profile?.email ||
                            (request.assigned_to ? 'Assigned' : '-')}
                        </TableCell>
                      )}
                      {isColumnVisible('created') && (
                        <TableCell
                          className="cursor-pointer"
                          onClick={() => {
                            if (onRequestSelect) {
                              onRequestSelect(request.id);
                            } else {
                              navigate(`/request/${requestNum}`);
                            }
                          }}
                        >
                          {formatAUDate(request.created_at)}
                        </TableCell>
                      )}
                      {isColumnVisible('updated') && (
                        <TableCell
                          className="cursor-pointer"
                          onClick={() => {
                            if (onRequestSelect) {
                              onRequestSelect(request.id);
                            } else {
                              navigate(`/request/${requestNum}`);
                            }
                          }}
                        >
                          {formatAUDate(request.updated_at)}
                        </TableCell>
                      )}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/request/${requestNum}`)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Results summary */}
        {totalCount > 0 && (
          <div className="text-sm text-muted-foreground mt-4">
            Showing {startItem}-{endItem} of {totalCount.toLocaleString()} request{totalCount !== 1 ? 's' : ''}
          </div>
        )}

        {/* Pagination Controls */}
        {(totalPages > 1 || totalCount > 10) && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page:</span>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={!hasPreviousPage || isLoading}
                  className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                >
                  <ChevronLeft className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={!hasNextPage || isLoading}
                  className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4 sm:ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Requests</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedRequests.length} request{selectedRequests.length > 1 ? 's' : ''}? 
                This action cannot be undone and will be logged in the audit trail.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSelected}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
