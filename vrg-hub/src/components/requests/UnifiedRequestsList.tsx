import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Eye, Clock, CheckCircle, XCircle, Package, Search, ArrowUpDown, RefreshCw, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatAUDate } from '@/lib/dateUtils';
import { useAuth } from '@/hooks/useAuth';
import { formatRequestId } from '@/lib/requestUtils';
import { AssignToMeButton } from './AssignToMeButton';
import { useRequests } from '@/hooks/useRequests';

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

interface UnifiedRequestsListProps {
  filterType?: 'all' | 'my-requests' | 'pending';
}

export function UnifiedRequestsList({ filterType = 'all' }: UnifiedRequestsListProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [typeFilter, setTypeFilter] = useState<'all' | 'hardware' | 'ticket'>('all');
  const navigate = useNavigate();
  const { } = useAuth();

  const {
    requests,
    isLoading,
    refetch,
    totalCount,
    hasNextPage,
    hasPreviousPage,
  } = useRequests({
    filterType,
    sourceFilter: typeFilter,
    page,
    pageSize,
    enabled: true,
  });

  const filteredAndSortedRequests = useMemo(() => {
    let filtered = [...requests];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => {
        const id = r.request_number ? formatRequestId(r.request_number).toLowerCase() : '';
        return (
          (r.title || '').toLowerCase().includes(q) ||
          id.includes(q) ||
          (r.status || '').toLowerCase().includes(q) ||
          (r.priority || '').toLowerCase().includes(q)
        );
      });
    }
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'priority': {
          const order = { urgent: 4, high: 3, medium: 2, low: 1 };
          comparison = (order[a.priority as keyof typeof order] ?? 0) - (order[b.priority as keyof typeof order] ?? 0);
          break;
        }
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return filtered;
  }, [requests, searchQuery, sortBy, sortOrder]);

  const requestType = (r: { request_types?: { name?: string }; source?: string }) => {
    if ((r as any).source === 'hardware_request') return 'hardware';
    return 'ticket';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      draft: { variant: 'secondary', icon: Clock },
      submitted: { variant: 'default', icon: Package },
      inbox: { variant: 'default', icon: Inbox },
      in_progress: { variant: 'default', icon: Clock },
      awaiting_information: { variant: 'warning', icon: Clock },
      on_hold: { variant: 'warning', icon: Clock },
      pending_manager_approval: { variant: 'warning', icon: Clock },
      pending_admin_approval: { variant: 'warning', icon: Clock },
      approved: { variant: 'success', icon: CheckCircle },
      completed: { variant: 'success', icon: CheckCircle },
      declined: { variant: 'destructive', icon: XCircle },
      ordered: { variant: 'default', icon: Package },
      delivered: { variant: 'success', icon: CheckCircle },
      cancelled: { variant: 'destructive', icon: XCircle },
    };
    const config = variants[status] || variants.draft;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      low: 'secondary',
      medium: 'default',
      high: 'warning',
      urgent: 'destructive',
    };
    return <Badge variant={variants[priority] || 'default'}>{priority}</Badge>;
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Requests</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, ID, status, or priority..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={typeFilter} onValueChange={(value: 'all' | 'hardware' | 'ticket') => { setTypeFilter(value); setPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="ticket">Tickets</SelectItem>
                </SelectContent>
              </Select>
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
                onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
              >
                <ArrowUpDown className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh requests">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {filteredAndSortedRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No requests match your search.' : 'No requests found. Create your first request to get started.'}
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedRequests.map((request) => {
                    const requestNum = request.request_number
                      ? formatRequestId(request.request_number)
                      : `request-${request.id}`;
                    const type = requestType(request as any);
                    return (
                      <TableRow
                        key={request.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/request/${requestNum}`)}
                      >
                        <TableCell className="font-mono text-xs">
                          {request.request_number ? formatRequestId(request.request_number) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{request.title}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                        <TableCell>{formatAUDate(request.created_at)}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <AssignToMeButton
                              requestId={request.id}
                              table="tickets"
                              currentAssignee={request.assigned_to}
                              assignedGroupId={(request as any).assigned_group_id}
                              onSuccess={() => refetch()}
                              variant="ghost"
                              size="sm"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/request/${requestNum}`)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
                >
                  <SelectTrigger className="w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalCount} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasPreviousPage}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasNextPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
