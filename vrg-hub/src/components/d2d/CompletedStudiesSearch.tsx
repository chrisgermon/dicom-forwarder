import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
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
  User,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

// D2D API Configuration - Use Edge Function proxy to avoid CORS
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const D2D_PROXY_URL = `${SUPABASE_URL}/functions/v1/d2d-proxy`;

const makeD2dRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${D2D_PROXY_URL}?endpoint=${encodeURIComponent(endpoint)}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response;
};

interface CompletedStudy {
  patient_name: string;
  patient_id: string;
  patient_birth_date?: string;
  patient_sex?: string;
  accession_number: string;
  study_description: string;
  study_date: string;
  study_time?: string;
  modality: string;
  study_instance_uid?: string;
  referring_physician?: string;
  source?: string;
}

interface SearchParams {
  patient_name: string;
  patient_id: string;
  accession_number: string;
  modality: string;
  study_date_from: string;
  study_date_to: string;
}

const MODALITIES = [
  { value: "", label: "All Modalities" },
  { value: "US", label: "Ultrasound (US)" },
  { value: "CT", label: "CT Scan (CT)" },
  { value: "MR", label: "MRI (MR)" },
  { value: "XA", label: "Angiography (XA)" },
  { value: "CR", label: "Computed Radiography (CR)" },
  { value: "DX", label: "Digital X-ray (DX)" },
  { value: "MG", label: "Mammography (MG)" },
  { value: "OT", label: "Other (OT)" },
];

// Format date for display
const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

// Format time for display
const formatTime = (timeStr: string | undefined) => {
  if (!timeStr) return "";
  try {
    // Handle time in HH:mm:ss format
    const parts = timeStr.split(":");
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
  } catch {
    return timeStr;
  }
};

// Get yesterday's date in YYYY-MM-DD format
const getYesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
};

// Get today's date in YYYY-MM-DD format
const getToday = () => {
  return new Date().toISOString().split("T")[0];
};

export function CompletedStudiesSearch() {
  const { toast } = useToast();
  const [isSearching, setIsSearching] = useState(false);
  const [studies, setStudies] = useState<CompletedStudy[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [searchParams, setSearchParams] = useState<SearchParams>({
    patient_name: "",
    patient_id: "",
    accession_number: "",
    modality: "",
    study_date_from: getYesterday(),
    study_date_to: getToday(),
  });

  const handleSearch = useCallback(async () => {
    setIsSearching(true);
    setHasSearched(true);

    try {
      // PACS configuration - flat structure matching working worklist query
      const requestBody: Record<string, unknown> = {
        host: "10.17.1.21",
        port: 5000,
        calling_ae: "D2D_SCU",
        ae_title: "AURVCMOD1",
        limit: 10,
      };

      // Only include non-empty fields
      if (searchParams.patient_name) {
        requestBody.patient_name = searchParams.patient_name;
      }
      if (searchParams.patient_id) {
        requestBody.patient_id = searchParams.patient_id;
      }
      if (searchParams.accession_number) {
        requestBody.accession_number = searchParams.accession_number;
      }
      if (searchParams.modality) {
        requestBody.modality = searchParams.modality;
      }
      if (searchParams.study_date_from) {
        requestBody.study_date_from = searchParams.study_date_from;
      }
      if (searchParams.study_date_to) {
        requestBody.study_date_to = searchParams.study_date_to;
      }

      console.log("Searching completed studies with params:", requestBody);

      const response = await makeD2dRequest("/api/worklist/completed-studies", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log("Search response:", data);

      if (response.ok && data.success) {
        setStudies(data.items || []);
        toast({
          title: "Search Complete",
          description: data.message || `Found ${data.count || 0} study(ies)`,
        });
      } else {
        setStudies([]);
        toast({
          title: "Search Failed",
          description: data.detail || data.error || "Failed to search completed studies",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      setStudies([]);
      toast({
        title: "Search Error",
        description: error instanceof Error ? error.message : "Network error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, [searchParams, toast]);

  const handleClear = () => {
    setSearchParams({
      patient_name: "",
      patient_id: "",
      accession_number: "",
      modality: "",
      study_date_from: getYesterday(),
      study_date_to: getToday(),
    });
    setStudies([]);
    setHasSearched(false);
    setSearchFilter("");
  };

  const handleInputChange = (field: keyof SearchParams, value: string) => {
    setSearchParams((prev) => ({ ...prev, [field]: value }));
  };

  // Filter studies based on search filter
  const filteredStudies = studies.filter((study) => {
    if (!searchFilter) return true;
    const filter = searchFilter.toLowerCase();
    return (
      study.patient_name?.toLowerCase().includes(filter) ||
      study.patient_id?.toLowerCase().includes(filter) ||
      study.accession_number?.toLowerCase().includes(filter) ||
      study.study_description?.toLowerCase().includes(filter) ||
      study.modality?.toLowerCase().includes(filter)
    );
  });

  return (
    <div className="space-y-4">
      {/* Search Form */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
            <Search className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-foreground">Search Completed Studies</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="patient_name">Patient Name</Label>
            <Input
              id="patient_name"
              placeholder="SMITH^JOHN or SMITH*"
              value={searchParams.patient_name}
              onChange={(e) => handleInputChange("patient_name", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Format: LASTNAME^FIRSTNAME (wildcards: *)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="patient_id">Patient ID (MRN)</Label>
            <Input
              id="patient_id"
              placeholder="K1234567"
              value={searchParams.patient_id}
              onChange={(e) => handleInputChange("patient_id", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accession_number">Accession Number</Label>
            <Input
              id="accession_number"
              placeholder="2026R001234"
              value={searchParams.accession_number}
              onChange={(e) => handleInputChange("accession_number", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="modality">Modality</Label>
            <Select
              value={searchParams.modality}
              onValueChange={(value) => handleInputChange("modality", value)}
            >
              <SelectTrigger id="modality">
                <SelectValue placeholder="All Modalities" />
              </SelectTrigger>
              <SelectContent>
                {MODALITIES.map((mod) => (
                  <SelectItem key={mod.value} value={mod.value || "all"}>
                    {mod.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="study_date_from">Date From</Label>
            <Input
              id="study_date_from"
              type="date"
              value={searchParams.study_date_from}
              onChange={(e) => handleInputChange("study_date_from", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="study_date_to">Date To</Label>
            <Input
              id="study_date_to"
              type="date"
              value={searchParams.study_date_to}
              onChange={(e) => handleInputChange("study_date_to", e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search Studies
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleClear} disabled={isSearching}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </Card>

      {/* Results */}
      {hasSearched && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">
                Results ({filteredStudies.length}
                {searchFilter && studies.length !== filteredStudies.length && ` of ${studies.length}`})
              </h3>
            </div>
            {studies.length > 0 && (
              <Input
                placeholder="Filter results..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="max-w-xs"
              />
            )}
          </div>

          {studies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No studies found</p>
              <p className="text-sm">Try adjusting your search criteria</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredStudies.map((study, index) => (
                  <div
                    key={`${study.accession_number}-${index}`}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="font-semibold text-foreground truncate">
                            {study.patient_name?.replace("^", ", ") || "Unknown"}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ({study.patient_id})
                          </span>
                          {study.patient_sex && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {study.patient_sex}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(study.study_date)}
                            {study.study_time && ` ${formatTime(study.study_time)}`}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                            {study.modality}
                          </span>
                          <span className="truncate">{study.study_description}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>ACC: {study.accession_number}</span>
                          {study.referring_physician && (
                            <span>Ref: {study.referring_physician?.replace("^", ", ")}</span>
                          )}
                          {study.patient_birth_date && (
                            <span>DOB: {formatDate(study.patient_birth_date)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </Card>
      )}

      {/* Help Card */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">Search Tips</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Patient Name:</strong> Use LASTNAME^FIRSTNAME format. Wildcards (*) are supported.</li>
              <li>• <strong>Date Range:</strong> Defaults to yesterday and today if not specified.</li>
              <li>• <strong>All fields are optional:</strong> Leave fields empty to broaden your search.</li>
              <li>• <strong>Filter results:</strong> Use the filter box to quickly find specific studies in the results.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
