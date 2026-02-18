import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays } from "date-fns";
import { Eye, Calendar, User, MapPin, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { MloVisitDetails, MloVisitDetailsPanel } from "./MloVisitDetailsPanel";

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

type SortField = 'visit_date' | 'visit_type' | 'contact_name' | 'outcome';
type SortDirection = 'asc' | 'desc';

interface AllVisitsTableProps {
  visits: MloVisitDetails[];
  isLoading: boolean;
}

export function AllVisitsTable({ visits, isLoading }: AllVisitsTableProps) {
  const [selectedVisit, setSelectedVisit] = useState<MloVisitDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [visitTypeFilter, setVisitTypeFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [dateQuickFilter, setDateQuickFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [clinicFilter, setClinicFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('visit_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Extract unique clinics/referrers for the filter dropdown
  const uniqueClinics = useMemo(() => {
    const clinics = new Set<string>();
    visits.forEach((visit) => {
      if (visit.clinic_name) clinics.add(visit.clinic_name);
      if (visit.referrer_name) clinics.add(visit.referrer_name);
    });
    return Array.from(clinics).sort();
  }, [visits]);

  // Handle quick date filter selection
  const handleQuickDateFilter = (value: string) => {
    setDateQuickFilter(value);
    const today = new Date();
    
    switch (value) {
      case 'today':
        setDateFrom(today);
        setDateTo(today);
        break;
      case 'this_week':
        setDateFrom(startOfWeek(today, { weekStartsOn: 1 }));
        setDateTo(endOfWeek(today, { weekStartsOn: 1 }));
        break;
      case 'this_month':
        setDateFrom(startOfMonth(today));
        setDateTo(endOfMonth(today));
        break;
      case 'last_7_days':
        setDateFrom(subDays(today, 7));
        setDateTo(today);
        break;
      case 'last_30_days':
        setDateFrom(subDays(today, 30));
        setDateTo(today);
        break;
      case 'custom':
        // Keep existing custom dates
        break;
      default:
        setDateFrom(undefined);
        setDateTo(undefined);
    }
  };

  // Apply filters and sorting
  const filteredVisits = useMemo(() => {
    let result = visits.filter((visit) => {
      // Visit type filter
      if (visitTypeFilter !== 'all' && visit.visit_type !== visitTypeFilter) return false;
      
      // Outcome filter
      if (outcomeFilter !== 'all' && visit.outcome !== outcomeFilter) return false;
      
      // Date range filter
      if (dateFrom || dateTo) {
        const visitDate = new Date(visit.visit_date);
        if (dateFrom && visitDate < dateFrom) return false;
        if (dateTo) {
          const endOfDay = new Date(dateTo);
          endOfDay.setHours(23, 59, 59, 999);
          if (visitDate > endOfDay) return false;
        }
      }
      
      // Clinic/Referrer filter
      if (clinicFilter !== 'all') {
        if (visit.clinic_name !== clinicFilter && visit.referrer_name !== clinicFilter) {
          return false;
        }
      }
      
      // Search term filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (
          !visit.contact_name?.toLowerCase().includes(search) &&
          !visit.purpose?.toLowerCase().includes(search) &&
          !visit.notes?.toLowerCase().includes(search) &&
          !visit.visitor_name?.toLowerCase().includes(search) &&
          !visit.clinic_name?.toLowerCase().includes(search) &&
          !visit.referrer_name?.toLowerCase().includes(search)
        ) {
          return false;
        }
      }
      return true;
    });

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'visit_date':
          comparison = new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime();
          break;
        case 'visit_type':
          comparison = a.visit_type.localeCompare(b.visit_type);
          break;
        case 'contact_name':
          comparison = (a.contact_name || '').localeCompare(b.contact_name || '');
          break;
        case 'outcome':
          comparison = (a.outcome || '').localeCompare(b.outcome || '');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [visits, visitTypeFilter, outcomeFilter, dateFrom, dateTo, clinicFilter, searchTerm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const clearFilters = () => {
    setVisitTypeFilter('all');
    setOutcomeFilter('all');
    setDateQuickFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setClinicFilter('all');
    setSearchTerm('');
  };

  const hasActiveFilters = visitTypeFilter !== 'all' || outcomeFilter !== 'all' || 
    dateQuickFilter !== 'all' || clinicFilter !== 'all' || searchTerm;

  return (
    <div>
      {/* Filters */}
      <div className="space-y-4 mb-6">
        {/* Search and Quick Filters Row */}
        <div className="flex flex-wrap gap-4">
          <Input
            placeholder="Search visits..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />

          <Select value={dateQuickFilter} onValueChange={handleQuickDateFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_7_days">Last 7 Days</SelectItem>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {dateQuickFilter === 'custom' && (
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn(!dateFrom && "text-muted-foreground")}>
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'MMM d, yyyy') : 'From'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn(!dateTo && "text-muted-foreground")}>
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'MMM d, yyyy') : 'To'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Filter Dropdowns Row */}
        <div className="flex flex-wrap gap-4">
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

          <Select value={clinicFilter} onValueChange={setClinicFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Clinic/Referrer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clinics/Referrers</SelectItem>
              {uniqueClinics.map((clinic) => (
                <SelectItem key={clinic} value={clinic}>{clinic}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground mb-4">
        Showing {filteredVisits.length} of {visits.length} visits
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('visit_date')}
                  className="h-8 px-2 -ml-2 font-medium"
                >
                  Date
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('visit_type')}
                  className="h-8 px-2 -ml-2 font-medium"
                >
                  Type
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>Visitor</TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('contact_name')}
                  className="h-8 px-2 -ml-2 font-medium"
                >
                  Contact
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>Clinic/Referrer</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('outcome')}
                  className="h-8 px-2 -ml-2 font-medium"
                >
                  Outcome
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>Follow-up</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Loading visits...
                </TableCell>
              </TableRow>
            ) : filteredVisits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No visits found
                </TableCell>
              </TableRow>
            ) : (
              filteredVisits.map((visit) => (
                <TableRow 
                  key={visit.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedVisit(visit)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {format(new Date(visit.visit_date), 'MMM d, yyyy')}
                    </div>
                    {visit.visit_time && (
                      <div className="text-xs text-muted-foreground">
                        {visit.visit_time.slice(0, 5)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {VISIT_TYPE_LABELS[visit.visit_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      {visit.visitor_name || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{visit.contact_name || '-'}</div>
                    {visit.contact_role && (
                      <div className="text-xs text-muted-foreground">{visit.contact_role}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate max-w-[150px]">
                        {visit.clinic_name || visit.referrer_name || '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[150px]">
                    <div className="truncate" title={visit.purpose || ''}>
                      {visit.purpose || '-'}
                    </div>
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
                      <div className={visit.follow_up_completed ? "line-through text-muted-foreground" : ""}>
                        {format(new Date(visit.follow_up_date), 'MMM d')}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVisit(visit);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Visit Details Panel */}
      <MloVisitDetailsPanel
        visit={selectedVisit}
        isOpen={!!selectedVisit}
        onClose={() => setSelectedVisit(null)}
      />
    </div>
  );
}
