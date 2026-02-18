import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Search, X, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import ranzcrLogo from "@/assets/ranzcr-logo.png";
import { CpdQuickGuide } from "@/components/cpd/CpdQuickGuide";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 50;

interface CpdRecord {
  id: string;
  user_id: string;
  meeting_id: string | null;
  custom_meeting_name: string | null;
  is_custom: boolean | null;
  category_id: string | null;
  attendance_date: string;
  duration_hours: number;
  cpd_hours_claimed: number;
  organisation: string | null;
  notes: string | null;
  attendance_mode: string | null;
  category?: { name: string } | null;
  meeting?: { name: string } | null;
  user?: { full_name: string; email: string } | null;
}

export default function CpdAllRecords() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Slim select: only columns needed for list + joins for display
  const selectCols = `
    id,
    user_id,
    meeting_id,
    custom_meeting_name,
    is_custom,
    category_id,
    attendance_date,
    duration_hours,
    cpd_hours_claimed,
    organisation,
    notes,
    attendance_mode,
    category:cpd_categories(name),
    meeting:cpd_meetings(name),
    user:profiles!cpd_attendance_user_id_fkey(full_name, email)
  `;

  // Paginated records with server-side filters
  const { data: pageData, isLoading } = useQuery({
    queryKey: ["cpd-all-records", page, PAGE_SIZE, categoryFilter, userFilter, searchQuery.trim() || null],
    queryFn: async () => {
      let query = supabase
        .from("cpd_attendance")
        .select(selectCols, { count: "exact" })
        .order("attendance_date", { ascending: false });

      if (categoryFilter !== "all") {
        query = query.eq("category_id", categoryFilter);
      }
      if (userFilter !== "all") {
        query = query.eq("user_id", userFilter);
      }
      if (searchQuery.trim().length >= 2) {
        const q = `%${searchQuery.trim()}%`;
        query = query.or(
          `custom_meeting_name.ilike.${q},organisation.ilike.${q},notes.ilike.${q}`
        );
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await query.range(from, to);

      if (error) throw error;
      return {
        records: (data || []) as CpdRecord[],
        totalCount: count ?? 0,
      };
    },
  });

  // Users with CPD records (for filter dropdown)
  const { data: usersWithRecords } = useQuery({
    queryKey: ["cpd-all-records-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cpd_attendance")
        .select("user_id, user:profiles!cpd_attendance_user_id_fkey(full_name)")
        .limit(500);
      if (error) throw error;
      const byId = new Map<string, { id: string; name: string }>();
      (data || []).forEach((r: any) => {
        if (r.user_id && !byId.has(r.user_id)) {
          byId.set(r.user_id, {
            id: r.user_id,
            name: r.user?.full_name || "Unknown",
          });
        }
      });
      return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
  });
  const uniqueUsers = usersWithRecords ?? [];

  const records = pageData?.records ?? [];
  const totalCount = pageData?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const totalHours = records.reduce((sum, r) => sum + r.cpd_hours_claimed, 0);

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setUserFilter("all");
    setPage(1);
  };

  const hasActiveFilters = searchQuery || categoryFilter !== "all" || userFilter !== "all";

  const handleExportCsv = () => {
    if (!records.length) {
      toast({
        title: "No Data",
        description: "There are no records on this page to export.",
        variant: "destructive",
      });
      return;
    }
    const headers = ["Date", "User", "Email", "Meeting/Activity", "Category", "Organisation", "Duration (hrs)", "CPD Hours", "Mode"];
    const rows = records.map((record) => [
      format(new Date(record.attendance_date), "dd/MM/yyyy"),
      record.user?.full_name || "Unknown",
      record.user?.email || "",
      record.is_custom ? record.custom_meeting_name || "" : record.meeting?.name || "",
      record.category?.name || "",
      record.organisation || "",
      record.duration_hours.toString(),
      record.cpd_hours_claimed.toString(),
      record.attendance_mode ? record.attendance_mode.charAt(0).toUpperCase() + record.attendance_mode.slice(1) : "Onsite",
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cpd-records-page-${page}-${new Date().toISOString().split("T")[0]}.csv`;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast({
      title: "Export Successful",
      description: `Exported ${records.length} records to CSV.`,
    });
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate("/cpd-tracker")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to CPD Tracker
        </Button>
        <div className="flex items-start gap-4">
          <img src={ranzcrLogo} alt="RANZCR Logo" className="h-16 w-auto" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">All CPD Records</h1>
            <p className="text-muted-foreground">
              View and search all CPD attendance records across users
            </p>
          </div>
        </div>
      </div>

      <CpdQuickGuide variant="compact" />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg">
              {totalCount} Total Records • Page {page} of {totalPages} • {totalHours.toFixed(1)} CPD Hours (this page)
            </CardTitle>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV (this page)
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by meeting, organisation, notes..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={userFilter}
              onValueChange={(v) => {
                setUserFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {uniqueUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <CategoriesSelect
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v);
                setPage(1);
              }}
            />
          </div>

          {isLoading ? (
            <p className="text-muted-foreground py-8 text-center">Loading records...</p>
          ) : records.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              {hasActiveFilters ? "No records match your filters." : "No CPD records found."}
            </p>
          ) : (
            <>
              <div className="rounded-md border overflow-auto max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Meeting/Activity</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                      <TableHead className="text-right">CPD Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(record.attendance_date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{record.user?.full_name || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">{record.user?.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {record.is_custom ? record.custom_meeting_name : record.meeting?.name}
                          </div>
                          {record.organisation && (
                            <div className="text-xs text-muted-foreground">{record.organisation}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{record.category?.name || "—"}</span>
                        </TableCell>
                        <TableCell className="text-right">{record.duration_hours}h</TableCell>
                        <TableCell className="text-right font-medium">
                          {record.cpd_hours_claimed}h
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CategoriesSelect({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (v: string) => void;
}) {
  const { data: categories } = useQuery({
    queryKey: ["cpd-categories-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cpd_categories")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full sm:w-[200px]">
        <SelectValue placeholder="All Categories" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Categories</SelectItem>
        {categories?.map((cat) => (
          <SelectItem key={cat.id} value={cat.id}>
            {cat.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
