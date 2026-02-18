import { useState, useEffect } from "react";
import { PageContainer } from "@/components/ui/page-container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Activity, Bone, Heart, Droplets, Link2, Microscope, Disc, AlertTriangle, CalendarIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// Helper to call Cloud Run via our authenticated proxy edge function
const callRadiologyApi = async (path: string, options?: { method?: string; body?: unknown }) => {
  const { data, error } = await supabase.functions.invoke("radiology-proxy", {
    body: {
      path,
      method: options?.method || "GET",
      payload: options?.body,
    },
  });
  if (error) throw error;
  return data;
};

interface SearchResult {
  accession_number: string;
  patient_id: string;
  study_date: string;
  service_description: string;
  worksite: string;
}

interface Stats {
  fractures: number;
  pneumonia: number;
  masses: number;
  effusions: number;
  arthritis: number;
}

const FINDING_TYPES = [
  { id: "fracture", label: "Fractures", icon: Bone, variant: "destructive" as const },
  { id: "pneumonia", label: "Pneumonia", icon: Heart, variant: "default" as const },
  { id: "mass", label: "Mass/Tumour", icon: Activity, variant: "secondary" as const },
  { id: "effusion", label: "Effusion", icon: Droplets, variant: "outline" as const },
  { id: "arthritis", label: "Arthritis", icon: Link2, variant: "default" as const },
  { id: "stenosis", label: "Stenosis", icon: Microscope, variant: "secondary" as const },
  { id: "disc", label: "Disc Pathology", icon: Disc, variant: "outline" as const },
];

const DATE_RANGES = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "this_month", label: "This Month" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "this_year", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

const MODALITIES = [
  { value: "all", label: "All Modalities" },
  { value: "XR", label: "X-Ray" },
  { value: "CT", label: "CT" },
  { value: "MR", label: "MRI" },
  { value: "US", label: "Ultrasound" },
];

export default function RadiologySearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedFinding, setSelectedFinding] = useState("fracture");
  const [dateRange, setDateRange] = useState("last_7_days");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [modality, setModality] = useState("all");
  const [site, setSite] = useState("all");
  const [sites, setSites] = useState<string[]>([]);
  const [customQuery, setCustomQuery] = useState("");
  const [executionTime, setExecutionTime] = useState(0);
  const [resultCount, setResultCount] = useState(0);

  useEffect(() => {
    callRadiologyApi("/api/sites")
      .then((data) => setSites(data.sites || []))
      .catch((err) => console.error("Failed to fetch sites:", err));

    callRadiologyApi("/api/stats/summary")
      .then((data) => setStats(data.findings))
      .catch((err) => console.error("Failed to fetch stats:", err));
  }, []);

  const handleQuickSearch = async (findingType: string) => {
    setLoading(true);
    setSelectedFinding(findingType);

    try {
      const searchParams: Record<string, unknown> = {
        finding_type: findingType,
        site: site === "all" ? null : site,
        modality: modality === "all" ? null : modality,
        limit: 100,
      };

      if (dateRange === "custom" && startDate && endDate) {
        searchParams.start_date = format(startDate, "yyyy-MM-dd");
        searchParams.end_date = format(endDate, "yyyy-MM-dd");
      } else {
        searchParams.date_range = dateRange;
      }

      const data = await callRadiologyApi("/api/search/quick", {
        method: "POST",
        body: searchParams,
      });
      setResults(data.results || []);
      setResultCount(data.total_count || 0);
      setExecutionTime(data.execution_time_ms || 0);
    } catch (error) {
      console.error("Search failed:", error);
      toast.error("Search failed. Please check the API configuration.");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSearch = async () => {
    if (!customQuery.trim()) return;

    setLoading(true);

    try {
      const data = await callRadiologyApi("/api/search/natural", {
        method: "POST",
        body: { query: customQuery, limit: 100 },
      });
      setResults(data.results || []);
      setResultCount(data.total_count || 0);
      setExecutionTime(data.execution_time_ms || 0);
    } catch (error) {
      console.error("Search failed:", error);
      toast.error("Search failed. Please check the API configuration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer maxWidth="2xl" className="space-y-6">
      {/* Warning Banner */}
      <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200 font-medium">
          This function is not for clinical use and is for research and data analysis only.
        </AlertDescription>
      </Alert>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Report Search</h1>
        <p className="text-muted-foreground mt-1">Search radiology reports by finding type</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-destructive">{stats.fractures?.toLocaleString() || 0}</div>
              <div className="text-sm text-muted-foreground">Fractures (30d)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{stats.pneumonia?.toLocaleString() || 0}</div>
              <div className="text-sm text-muted-foreground">Pneumonia (30d)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.masses?.toLocaleString() || 0}</div>
              <div className="text-sm text-muted-foreground">Masses (30d)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-cyan-600">{stats.effusions?.toLocaleString() || 0}</div>
              <div className="text-sm text-muted-foreground">Effusions (30d)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.arthritis?.toLocaleString() || 0}</div>
              <div className="text-sm text-muted-foreground">Arthritis (30d)</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Search */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Search</CardTitle>
          <CardDescription>Select a finding type and filters to search</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Finding Type Buttons */}
          <div className="flex flex-wrap gap-3">
            {FINDING_TYPES.map((finding) => {
              const Icon = finding.icon;
              return (
                <Button
                  key={finding.id}
                  onClick={() => handleQuickSearch(finding.id)}
                  variant={selectedFinding === finding.id ? "default" : "outline"}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {finding.label}
                </Button>
              );
            })}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {dateRange === "custom" && (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[180px] justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[180px] justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => startDate ? date < startDate : false}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Modality</Label>
              <Select value={modality} onValueChange={setModality}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODALITIES.map((mod) => (
                    <SelectItem key={mod.value} value={mod.value}>
                      {mod.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Site</Label>
              <Select value={site} onValueChange={setSite}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Sites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {sites.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={() => handleQuickSearch(selectedFinding)} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Search */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Search</CardTitle>
          <CardDescription>Use natural language: "rotator cuff tears at Mornington last month"</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCustomSearch()}
              placeholder="e.g., kidney stones on CT this year, ACL tears at Shepparton..."
              className="flex-1"
            />
            <Button onClick={handleCustomSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              Results{" "}
              {resultCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {resultCount}
                </Badge>
              )}
            </CardTitle>
          </div>
          {executionTime > 0 && <span className="text-sm text-muted-foreground">{executionTime}ms</span>}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-muted-foreground">Searching...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No results. Select a finding type and click Search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Accession</TableHead>
                    <TableHead>Patient ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Study</TableHead>
                    <TableHead>Site</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-primary">{result.accession_number}</TableCell>
                      <TableCell>{result.patient_id}</TableCell>
                      <TableCell>{result.study_date}</TableCell>
                      <TableCell>{result.service_description}</TableCell>
                      <TableCell className="text-muted-foreground">{result.worksite}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
