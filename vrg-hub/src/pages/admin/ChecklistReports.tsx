import { useState } from "react";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { Calendar, ChevronDown, ChevronRight, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useChecklistReports } from "@/hooks/useChecklistReports";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { exportChecklistToExcel } from "@/lib/exportChecklistReports";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";

const ChecklistReports = () => {
  const [dateRange, setDateRange] = useState("today");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: new Date(),
  });

  // Calculate date range based on selection
  const getDateRange = () => {
    const today = new Date();
    switch (dateRange) {
      case "today":
        return { startDate: startOfDay(today), endDate: endOfDay(today) };
      case "last7":
        return { startDate: startOfDay(subDays(today, 7)), endDate: endOfDay(today) };
      case "last30":
        return { startDate: startOfDay(subDays(today, 30)), endDate: endOfDay(today) };
      case "custom":
        return { startDate: startOfDay(customDateRange.from), endDate: endOfDay(customDateRange.to) };
      default:
        return { startDate: startOfDay(today), endDate: endOfDay(today) };
    }
  };

  const { startDate, endDate } = getDateRange();
  const filters = {
    startDate,
    endDate,
    locationId: locationFilter !== "all" ? locationFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  };

  const { summaryStats, summaryLoading, completionRecords, recordsLoading, fetchItemCompletions } =
    useChecklistReports(filters);

  // Fetch locations for filter
  const { data: locations } = useQuery({
    queryKey: ["locations-for-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleExport = async () => {
    if (!completionRecords || completionRecords.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      toast.loading("Preparing export...");
      
      // Fetch all item completions for the records
      const itemCompletionsByRecord: Record<string, any[]> = {};
      for (const record of completionRecords) {
        const items = await fetchItemCompletions(record.id);
        itemCompletionsByRecord[record.id] = items || [];
      }

      await exportChecklistToExcel(completionRecords, itemCompletionsByRecord);
      toast.success("Report exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-success/20 text-success border-success/30">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-warning/20 text-warning border-warning/30">In Progress</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getItemStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "✅";
      case "na":
        return "N/A";
      case "pending":
        return "⬜";
      default:
        return "—";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Checklist Reports</h1>
          <p className="text-muted-foreground">View and export checklist completion data</p>
        </div>
        <Button onClick={handleExport} disabled={!completionRecords || completionRecords.length === 0}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export to Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Records</CardDescription>
            <CardTitle className="text-3xl">
              {summaryLoading ? "..." : summaryStats?.totalCompletions || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl text-success">
              {summaryLoading ? "..." : summaryStats?.completed || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-3xl text-warning">
              {summaryLoading ? "..." : summaryStats?.inProgress || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Avg Completion Rate</CardDescription>
            <CardTitle className="text-3xl">
              {summaryLoading ? "..." : `${summaryStats?.averageCompletionRate || 0}%`}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last7">Last 7 Days</SelectItem>
                  <SelectItem value="last30">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === "custom" && (
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      {format(customDateRange.from, "MMM dd, yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={customDateRange.from}
                      onSelect={(date) => date && setCustomDateRange({ ...customDateRange, from: date })}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      {format(customDateRange.to, "MMM dd, yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={customDateRange.to}
                      onSelect={(date) => date && setCustomDateRange({ ...customDateRange, to: date })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Location</label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations?.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Completion Records</CardTitle>
          <CardDescription>
            {recordsLoading ? "Loading..." : `${completionRecords?.length || 0} records found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completion %</TableHead>
                  <TableHead>Completed By</TableHead>
                  <TableHead>Completed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completionRecords?.map((record) => (
                  <ExpandableRow
                    key={record.id}
                    record={record}
                    expanded={expandedRows.has(record.id)}
                    onToggle={() => toggleRow(record.id)}
                    fetchItemCompletions={fetchItemCompletions}
                    getStatusBadge={getStatusBadge}
                    getItemStatusIcon={getItemStatusIcon}
                  />
                ))}
                {!recordsLoading && completionRecords?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No records found for the selected filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

const ExpandableRow = ({ record, expanded, onToggle, fetchItemCompletions, getStatusBadge, getItemStatusIcon }: any) => {
  const [itemCompletions, setItemCompletions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!expanded && itemCompletions.length === 0) {
      setLoading(true);
      try {
        const items = await fetchItemCompletions(record.id);
        setItemCompletions(items || []);
      } catch (error) {
        console.error("Failed to fetch item completions:", error);
        toast.error("Failed to load task details");
      } finally {
        setLoading(false);
      }
    }
    onToggle();
  };

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={handleToggle}>
        <TableCell>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </TableCell>
        <TableCell>{format(new Date(record.checklist_date), "MMM dd, yyyy")}</TableCell>
        <TableCell>{record.locations?.name || "N/A"}</TableCell>
        <TableCell>{record.checklist_templates?.name || "N/A"}</TableCell>
        <TableCell>{getStatusBadge(record.status)}</TableCell>
        <TableCell>{record.completion_percentage || 0}%</TableCell>
        <TableCell>
          {record.completed_by || "N/A"}
        </TableCell>
        <TableCell>
          {record.completed_at ? format(new Date(record.completed_at), "MMM dd, h:mm a") : "N/A"}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/30 p-0">
            <div className="p-4 space-y-2">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading tasks...</p>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Task Details</h4>
                  {itemCompletions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tasks found</p>
                  ) : (
                    <div className="grid gap-2">
                      {itemCompletions.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-3 bg-background rounded-md border text-sm"
                        >
                          <span className="text-lg">{getItemStatusIcon(item.status)}</span>
                          <div className="flex-1 space-y-1">
                            <div className="font-medium">{item.checklist_items?.task_description}</div>
                            {item.checklist_items?.time_slot && (
                              <div className="text-xs text-muted-foreground">
                                Time Slot: {item.checklist_items.time_slot}
                              </div>
                            )}
                            {item.notes && (
                              <div className="text-xs text-muted-foreground">Notes: {item.notes}</div>
                            )}
                          </div>
                          <div className="text-right space-y-1">
                            <div className="text-xs font-medium">
                              {item.initials || item.completed_by || "N/A"}
                            </div>
                            {item.completed_at && (
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(item.completed_at), "h:mm a")}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

export default ChecklistReports;
