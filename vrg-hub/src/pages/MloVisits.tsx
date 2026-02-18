import { useState } from "react";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { format } from "date-fns";
import { Plus, Download, Edit2, Calendar, CalendarPlus, CalendarX, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useMloVisits, useAllMloVisits, MloVisit } from "@/hooks/useMloData";
import { MloVisitForm } from "@/components/mlo/MloVisitForm";
import { useMloCalendarSync, useVisitSyncStatus, useHasOffice365Connection } from "@/hooks/useMloCalendarSync";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMloRole } from "@/hooks/useMloRole";

const VISIT_TYPE_LABELS: Record<string, string> = {
  site_visit: 'Site Visit',
  phone_call: 'Phone Call',
  video_call: 'Video Call',
  email: 'Email',
  event: 'Event',
  other: 'Other',
};

const OUTCOME_LABELS: Record<string, string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  follow_up_required: 'Follow-up Required',
  issue_raised: 'Issue Raised',
  no_contact: 'No Contact',
};

const OUTCOME_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  positive: 'default',
  neutral: 'secondary',
  follow_up_required: 'outline',
  issue_raised: 'destructive',
  no_contact: 'secondary',
};

// Calendar Sync Button Component
function CalendarSyncButton({ visitId, hasFollowUp }: { visitId: string; hasFollowUp: boolean }) {
  const { syncVisitToCalendar, removeSyncFromCalendar, isSyncing } = useMloCalendarSync();
  const { data: syncStatus } = useVisitSyncStatus(visitId);
  const { data: hasConnection } = useHasOffice365Connection();

  if (!hasFollowUp) return null;

  const isSynced = syncStatus?.synced;

  if (!hasConnection) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" disabled>
              <CalendarPlus className="h-4 w-4 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Connect Office 365 in Integrations to sync calendar</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={isSyncing}
            onClick={() => {
              if (isSynced) {
                removeSyncFromCalendar.mutate(visitId);
              } else {
                syncVisitToCalendar.mutate(visitId);
              }
            }}
          >
            {isSynced ? (
              <CalendarX className="h-4 w-4 text-green-600" />
            ) : (
              <CalendarPlus className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isSynced ? 'Remove from Outlook calendar' : 'Add to Outlook calendar'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function MloVisits() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<MloVisit | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | undefined>();
  const [visitTypeFilter, setVisitTypeFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [mloFilter, setMloFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const { isMloManager, isLoading: isRoleLoading } = useMloRole();

  // Use all visits for managers, own visits for regular MLOs
  const { data: ownVisits, isLoading: isOwnLoading } = useMloVisits(undefined, dateRange);
  const { data: allVisits, isLoading: isAllLoading } = useAllMloVisits(dateRange);

  const visits = isMloManager ? allVisits : ownVisits;
  const isLoading = isRoleLoading || (isMloManager ? isAllLoading : isOwnLoading);

  // Get unique MLO users for filter dropdown (only for managers)
  const mloUsers = isMloManager && allVisits 
    ? Array.from(new Map(allVisits.map(v => [v.user_id, v.user])).values()).filter(Boolean)
    : [];

  // Apply filters
  const filteredVisits = visits?.filter((visit) => {
    if (visitTypeFilter !== 'all' && visit.visit_type !== visitTypeFilter) return false;
    if (outcomeFilter !== 'all' && visit.outcome !== outcomeFilter) return false;
    if (isMloManager && mloFilter !== 'all' && visit.user_id !== mloFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !visit.contact_name?.toLowerCase().includes(search) &&
        !visit.purpose?.toLowerCase().includes(search) &&
        !visit.notes?.toLowerCase().includes(search) &&
        !visit.location?.name.toLowerCase().includes(search) &&
        !visit.user?.full_name?.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    return true;
  });

  const handleDateRangeApply = () => {
    if (dateFrom && dateTo) {
      setDateRange({
        start: format(dateFrom, 'yyyy-MM-dd'),
        end: format(dateTo, 'yyyy-MM-dd'),
      });
    } else {
      setDateRange(undefined);
    }
  };

  const clearFilters = () => {
    setVisitTypeFilter('all');
    setOutcomeFilter('all');
    setMloFilter('all');
    setSearchTerm('');
    setDateFrom(undefined);
    setDateTo(undefined);
    setDateRange(undefined);
  };

  const exportToCsv = () => {
    if (!filteredVisits?.length) return;

    const headers = isMloManager 
      ? ['Date', 'MLO', 'Type', 'Contact', 'Role', 'Location', 'Purpose', 'Outcome', 'Notes', 'Follow-up Date']
      : ['Date', 'Type', 'Contact', 'Role', 'Location', 'Purpose', 'Outcome', 'Notes', 'Follow-up Date'];
    
    const rows = filteredVisits.map((v) => {
      const baseRow = [
        v.visit_date,
        VISIT_TYPE_LABELS[v.visit_type],
        v.contact_name || '',
        v.contact_role || '',
        v.location?.name || '',
        v.purpose || '',
        v.outcome ? OUTCOME_LABELS[v.outcome] : '',
        v.notes || '',
        v.follow_up_date || '',
      ];
      
      if (isMloManager) {
        return [v.visit_date, v.user?.full_name || '', ...baseRow.slice(1)];
      }
      return baseRow;
    });

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mlo-visits-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <PageContainer>
      <PageHeader 
        title={isMloManager ? "All MLO Visits" : "Visit Log"}
        description={isMloManager ? "View and manage visits for all MLO team members" : "Track and manage your client visits"}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCsv} disabled={!filteredVisits?.length}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Log Visit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Log New Visit</DialogTitle>
                </DialogHeader>
                <MloVisitForm 
                  onSuccess={() => setIsAddDialogOpen(false)}
                  onCancel={() => setIsAddDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Input
          placeholder="Search contacts, notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-64"
        />

        <Select value={visitTypeFilter} onValueChange={setVisitTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Visit Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(VISIT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* MLO Filter - Only shown for managers */}
        {isMloManager && mloUsers.length > 0 && (
          <Select value={mloFilter} onValueChange={setMloFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="MLO" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All MLOs</SelectItem>
              {mloUsers.map((user) => (
                <SelectItem key={user?.id} value={user?.id || ''}>
                  {user?.full_name || user?.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn(!dateRange && "text-muted-foreground")}>
              <Calendar className="mr-2 h-4 w-4" />
              {dateRange 
                ? `${format(new Date(dateRange.start), 'MMM d')} - ${format(new Date(dateRange.end), 'MMM d')}`
                : 'Date Range'
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="flex gap-4">
              <div>
                <div className="text-sm font-medium mb-2">From</div>
                <CalendarComponent
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </div>
              <div>
                <div className="text-sm font-medium mb-2">To</div>
                <CalendarComponent
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => {
                setDateFrom(undefined);
                setDateTo(undefined);
                setDateRange(undefined);
              }}>
                Clear
              </Button>
              <Button size="sm" onClick={handleDateRangeApply}>
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {(visitTypeFilter !== 'all' || outcomeFilter !== 'all' || mloFilter !== 'all' || searchTerm || dateRange) && (
          <Button variant="ghost" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground mb-4">
        Showing {filteredVisits?.length || 0} visits
      </div>

      {/* Visits Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              {isMloManager && <TableHead>MLO</TableHead>}
              <TableHead>Type</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Follow-up</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  {isMloManager && <TableCell><Skeleton className="h-4 w-24" /></TableCell>}
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : filteredVisits?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isMloManager ? 9 : 8} className="p-0">
                  <EmptyState
                    icon={<Users />}
                    title="No visits found"
                    description={searchTerm || visitTypeFilter !== 'all' || outcomeFilter !== 'all' || dateRange
                      ? "Try adjusting your filters to find more results."
                      : "Log your first visit to start tracking client interactions."}
                    action={!searchTerm && visitTypeFilter === 'all' && outcomeFilter === 'all' && !dateRange ? {
                      label: "Log Visit",
                      onClick: () => setIsAddDialogOpen(true),
                      icon: <Plus className="h-4 w-4" />,
                    } : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredVisits?.map((visit) => (
                <TableRow key={visit.id}>
                  <TableCell className="font-medium">
                    {format(new Date(visit.visit_date), 'MMM d, yyyy')}
                  </TableCell>
                  {isMloManager && (
                    <TableCell>
                      <div className="text-sm font-medium">{visit.user?.full_name || '-'}</div>
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="secondary">
                      {VISIT_TYPE_LABELS[visit.visit_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>{visit.contact_name || '-'}</div>
                    {visit.contact_role && (
                      <div className="text-sm text-muted-foreground">{visit.contact_role}</div>
                    )}
                  </TableCell>
                  <TableCell>{visit.location?.name || '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {visit.purpose || '-'}
                  </TableCell>
                  <TableCell>
                    {visit.outcome ? (
                      <Badge variant={OUTCOME_VARIANTS[visit.outcome]}>
                        {OUTCOME_LABELS[visit.outcome]}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {visit.follow_up_date ? (
                      <div className={cn(
                        "text-sm",
                        visit.follow_up_completed && "line-through text-muted-foreground"
                      )}>
                        {format(new Date(visit.follow_up_date), 'MMM d')}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <CalendarSyncButton 
                        visitId={visit.id} 
                        hasFollowUp={!!visit.follow_up_date && !visit.follow_up_completed} 
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingVisit(visit)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingVisit} onOpenChange={(open) => !open && setEditingVisit(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Visit</DialogTitle>
          </DialogHeader>
          {editingVisit && (
            <MloVisitForm 
              visit={editingVisit}
              onSuccess={() => setEditingVisit(null)}
              onCancel={() => setEditingVisit(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
