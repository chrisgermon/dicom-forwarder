import { useState, useCallback } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Loader2,
  User,
  Calendar,
  CheckCircle,
  RefreshCw,
  X,
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
      "Content-Type": "application/json",
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

interface PatientData {
  patient_name: string;
  patient_id: string;
  patient_birth_date: string;
  patient_sex: string;
  study_description: string;
  accession_number: string;
  referring_physician: string;
  procedure_description?: string;
}

interface SearchParams {
  patient_name: string;
  patient_id: string;
  accession_number: string;
  modality: string;
  study_date_from: string;
  study_date_to: string;
}

interface CompletedStudiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPatient: (patient: PatientData) => void;
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

const getYesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
};

const getToday = () => {
  return new Date().toISOString().split("T")[0];
};

export function CompletedStudiesDialog({
  open,
  onOpenChange,
  onSelectPatient,
}: CompletedStudiesDialogProps) {
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
      };

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

      const response = await makeD2dRequest("/api/worklist/completed-studies", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

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
          description:
            data.detail || data.error || "Failed to search completed studies",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      setStudies([]);
      toast({
        title: "Search Error",
        description:
          error instanceof Error ? error.message : "Network error occurred",
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

  const handleSelectStudy = (study: CompletedStudy) => {
    const patientData: PatientData = {
      patient_name: study.patient_name,
      patient_id: study.patient_id,
      patient_birth_date: study.patient_birth_date || "",
      patient_sex: study.patient_sex || "",
      study_description: study.study_description,
      accession_number: study.accession_number,
      referring_physician: study.referring_physician || "",
      procedure_description: study.study_description,
    };
    onSelectPatient(patientData);
    onOpenChange(false);
  };

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Completed Studies
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search Form */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dialog_patient_name" className="text-xs">
                Patient Name
              </Label>
              <Input
                id="dialog_patient_name"
                placeholder="SMITH^JOHN or SMITH*"
                value={searchParams.patient_name}
                onChange={(e) =>
                  handleInputChange("patient_name", e.target.value)
                }
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dialog_patient_id" className="text-xs">
                Patient ID (MRN)
              </Label>
              <Input
                id="dialog_patient_id"
                placeholder="K1234567"
                value={searchParams.patient_id}
                onChange={(e) =>
                  handleInputChange("patient_id", e.target.value)
                }
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dialog_accession" className="text-xs">
                Accession Number
              </Label>
              <Input
                id="dialog_accession"
                placeholder="2026R001234"
                value={searchParams.accession_number}
                onChange={(e) =>
                  handleInputChange("accession_number", e.target.value)
                }
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dialog_modality" className="text-xs">
                Modality
              </Label>
              <Select
                value={searchParams.modality}
                onValueChange={(value) =>
                  handleInputChange("modality", value === "all" ? "" : value)
                }
              >
                <SelectTrigger id="dialog_modality" className="h-9">
                  <SelectValue placeholder="All Modalities" />
                </SelectTrigger>
                <SelectContent>
                  {MODALITIES.map((mod) => (
                    <SelectItem key={mod.value || "all"} value={mod.value || "all"}>
                      {mod.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dialog_date_from" className="text-xs">
                Date From
              </Label>
              <Input
                id="dialog_date_from"
                type="date"
                value={searchParams.study_date_from}
                onChange={(e) =>
                  handleInputChange("study_date_from", e.target.value)
                }
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dialog_date_to" className="text-xs">
                Date To
              </Label>
              <Input
                id="dialog_date_to"
                type="date"
                value={searchParams.study_date_to}
                onChange={(e) =>
                  handleInputChange("study_date_to", e.target.value)
                }
                className="h-9"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSearch} disabled={isSearching} size="sm">
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={isSearching}
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>

          {/* Results */}
          {hasSearched && (
            <div className="flex-1 overflow-hidden flex flex-col border rounded-lg">
              <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                <span className="text-sm font-medium">
                  {filteredStudies.length} result
                  {filteredStudies.length !== 1 ? "s" : ""}
                  {searchFilter &&
                    studies.length !== filteredStudies.length &&
                    ` of ${studies.length}`}
                </span>
                {studies.length > 0 && (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Filter results..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="h-8 w-48 pl-8 pr-8 text-sm"
                    />
                    {searchFilter && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setSearchFilter("")}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <ScrollArea className="flex-1">
                {filteredStudies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Search className="w-10 h-10 mb-3 opacity-30" />
                    <p className="font-medium">No studies found</p>
                    <p className="text-sm">Try adjusting your search criteria</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredStudies.map((study, index) => (
                      <button
                        key={`${study.accession_number}-${index}`}
                        onClick={() => handleSelectStudy(study)}
                        className="w-full text-left p-3 rounded-lg border bg-card hover:bg-primary/5 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-4 h-4 text-primary flex-shrink-0" />
                              <span className="font-semibold text-foreground truncate">
                                {study.patient_name?.replace("^", ", ") ||
                                  "Unknown"}
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
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(study.study_date)}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                                {study.modality}
                              </span>
                              <span className="truncate">
                                {study.study_description}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              ACC: {study.accession_number}
                              {study.referring_physician &&
                                ` • Ref: ${study.referring_physician?.replace("^", ", ")}`}
                            </div>
                          </div>
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
