/**
 * PACS Query/Retrieve & Service Status
 *
 * Uses existing D2D completed-studies API to query PACS and show status.
 * "Activate service" is done by running the DicomForwarder script on the server
 * (C-FIND → C-MOVE to forwarder → store then delete); this page shows query status
 * and instructions.
 */

import { useState, useCallback } from "react";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Loader2,
  Activity,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  FileText,
  User,
  Calendar,
  Terminal,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const D2D_PROXY_URL = `${SUPABASE_URL}/functions/v1/d2d-proxy`;

const makeD2dRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${D2D_PROXY_URL}?endpoint=${encodeURIComponent(endpoint)}`;
  return fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
};

interface CompletedStudy {
  patient_name: string;
  patient_id: string;
  accession_number: string;
  study_description: string;
  study_date: string;
  study_time?: string;
  modality: string;
  study_instance_uid?: string;
}

const getYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
};
const getToday = () => new Date().toISOString().split("T")[0];

const MODALITIES = [
  { value: "", label: "All" },
  { value: "US", label: "US" },
  { value: "CT", label: "CT" },
  { value: "MR", label: "MR" },
  { value: "DX", label: "DX" },
  { value: "CR", label: "CR" },
  { value: "MG", label: "MG" },
];

export default function PacsQueryRetrieve() {
  const { toast } = useToast();
  const [isSearching, setIsSearching] = useState(false);
  const [studies, setStudies] = useState<CompletedStudy[]>([]);
  const [queryStatus, setQueryStatus] = useState<{
    lastRun: string | null;
    success: boolean;
    count: number;
    message: string;
  }>({ lastRun: null, success: false, count: 0, message: "" });
  const [params, setParams] = useState({
    patient_name: "",
    patient_id: "",
    accession_number: "",
    modality: "",
    study_date_from: getYesterday(),
    study_date_to: getToday(),
  });

  const handleSearch = useCallback(async () => {
    setIsSearching(true);
    setQueryStatus((prev) => ({ ...prev, message: "Querying PACS..." }));
    try {
      const body: Record<string, unknown> = {
        host: "10.17.1.21",
        port: 5000,
        calling_ae: "D2D_SCU",
        ae_title: "AURVCMOD1",
        limit: 50,
      };
      if (params.patient_name) body.patient_name = params.patient_name;
      if (params.patient_id) body.patient_id = params.patient_id;
      if (params.accession_number) body.accession_number = params.accession_number;
      if (params.modality) body.modality = params.modality;
      if (params.study_date_from) body.study_date_from = params.study_date_from;
      if (params.study_date_to) body.study_date_to = params.study_date_to;

      const response = await makeD2dRequest("/api/worklist/completed-studies", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        const items = data.items || [];
        setStudies(items);
        setQueryStatus({
          lastRun: new Date().toISOString(),
          success: true,
          count: items.length,
          message: `Found ${items.length} study(ies)`,
        });
        toast({
          title: "Query OK",
          description: data.message || `${items.length} study(ies) found`,
        });
      } else {
        setStudies([]);
        setQueryStatus({
          lastRun: new Date().toISOString(),
          success: false,
          count: 0,
          message: data.detail || data.error || "Query failed",
        });
        toast({
          title: "Query failed",
          description: data.detail || data.error || "Failed to query PACS",
          variant: "destructive",
        });
      }
    } catch (err) {
      setStudies([]);
      setQueryStatus({
        lastRun: new Date().toISOString(),
        success: false,
        count: 0,
        message: err instanceof Error ? err.message : "Network error",
      });
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Network error",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, [params, toast]);

  const formatDate = (s: string) => {
    if (!s) return "";
    if (s.length === 8 && !s.includes("-"))
      return `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`;
    return s;
  };

  return (
    <PageContainer>
      <PageHeader
        title="PACS Query / Retrieve & Service Status"
        description="Query PACS for completed studies and activate the DICOM forwarder (query → retrieve → store then delete)."
      />

      {/* Status card */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Query status
          </CardTitle>
          <CardDescription>
            Last PACS query result and service activation instructions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            {queryStatus.lastRun ? (
              <>
                {queryStatus.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
                <span className="text-sm text-muted-foreground">
                  Last run: {new Date(queryStatus.lastRun).toLocaleString()}
                </span>
                <span className="text-sm font-medium">
                  {queryStatus.success
                    ? `${queryStatus.count} studies`
                    : queryStatus.message}
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                Run a query below to see PACS status.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Query form */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Query PACS (completed studies)
          </CardTitle>
          <CardDescription>
            Uses existing D2D worklist/completed-studies; same config as D2D converter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Patient name</Label>
              <Input
                placeholder="LAST^FIRST or *"
                value={params.patient_name}
                onChange={(e) =>
                  setParams((p) => ({ ...p, patient_name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Patient ID</Label>
              <Input
                placeholder="MRN"
                value={params.patient_id}
                onChange={(e) =>
                  setParams((p) => ({ ...p, patient_id: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Accession</Label>
              <Input
                placeholder="Accession number"
                value={params.accession_number}
                onChange={(e) =>
                  setParams((p) => ({ ...p, accession_number: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Modality</Label>
              <Select
                value={params.modality || "all"}
                onValueChange={(v) =>
                  setParams((p) => ({ ...p, modality: v === "all" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  {MODALITIES.map((m) => (
                    <SelectItem key={m.value || "all"} value={m.value || "all"}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date from</Label>
              <Input
                type="date"
                value={params.study_date_from}
                onChange={(e) =>
                  setParams((p) => ({ ...p, study_date_from: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Date to</Label>
              <Input
                type="date"
                value={params.study_date_to}
                onChange={(e) =>
                  setParams((p) => ({ ...p, study_date_to: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Querying...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Query PACS
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setParams({ ...params, study_date_from: getYesterday(), study_date_to: getToday() })}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset dates
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {studies.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Results ({studies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[320px]">
              <div className="space-y-2">
                {studies.map((s, i) => (
                  <div
                    key={`${s.accession_number}-${i}`}
                    className="p-3 rounded-lg border bg-card text-sm"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {s.patient_name?.replace("^", ", ") || "—"}
                      </span>
                      <span className="text-muted-foreground">({s.patient_id})</span>
                      <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {s.modality}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(s.study_date)}
                      </span>
                      <span>ACC: {s.accession_number}</span>
                      {s.study_description && (
                        <span className="truncate">{s.study_description}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Activate service */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Activate forwarder service (query → retrieve → store then delete)
          </CardTitle>
          <CardDescription>
            Run the DicomForwarder script on the server where the forwarder runs. It will
            C-FIND one recent study, C-MOVE it to the forwarder (so it receives via C-STORE),
            then delete the stored images. This only activates the service; no data is kept.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="rounded bg-muted p-4 text-sm overflow-x-auto">
            {"# From DicomForwarder repo (where config.json is)"}
            {"\npython scripts/activate_service.py [--config config.json]"}
            {"\n\n# Optional: wait longer before delete, or skip delete for debugging"}
            {"\npython scripts/activate_service.py --wait 45"}
            {"\npython scripts/activate_service.py --no-delete"}
          </pre>
          <p className="text-sm text-muted-foreground">
            The forwarder (C-STORE SCP) must be running. PACS must have the forwarder’s AE
            title and host:port configured for C-MOVE destination.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
