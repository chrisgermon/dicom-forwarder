import { useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  File,
  X,
  CheckCircle,
  XCircle,
  Loader2,
  HardDrive,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// D2D API Configuration - Use Edge Function proxy to avoid CORS
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const D2D_PROXY_URL = `${SUPABASE_URL}/functions/v1/d2d-proxy`;

const makeD2dRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${D2D_PROXY_URL}?endpoint=${encodeURIComponent(endpoint)}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
    },
  });
  return response;
};

interface DicomDestination {
  name: string;
  ae_title: string;
  host: string;
  port: number;
}

interface DicomMetadata {
  patient_name?: string;
  patient_id?: string;
  study_description?: string;
  study_date?: string;
  modality?: string;
  series_description?: string;
  sop_class?: string;
}

interface FileWithStatus {
  file: File;
  id: string;
  status: "pending" | "validating" | "validated" | "uploading" | "success" | "error";
  message?: string;
  metadata?: DicomMetadata;
}

interface UploadResult {
  filename: string;
  success: boolean;
  message: string;
  patient_name?: string;
  patient_id?: string;
  study_uid?: string;
}

export function DicomUpload() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [destinations, setDestinations] = useState<DicomDestination[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<string>("");
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Fetch available DICOM destinations
  const fetchDestinations = useCallback(async () => {
    setIsLoadingDestinations(true);
    try {
      const response = await makeD2dRequest('/api/destinations');
      if (response.ok) {
        const data = await response.json();
        setDestinations(data.destinations || []);
        if (data.destinations?.length > 0 && !selectedDestination) {
          setSelectedDestination(data.destinations[0].name);
        }
      }
    } catch (error) {
      console.error("Failed to fetch destinations:", error);
    } finally {
      setIsLoadingDestinations(false);
    }
  }, [selectedDestination]);

  // Load destinations on mount
  useState(() => {
    fetchDestinations();
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  }, []);

  const addFiles = async (newFiles: File[]) => {
    const dicomFiles = newFiles.filter(
      (file) =>
        file.name.toLowerCase().endsWith(".dcm") ||
        file.name.toLowerCase().endsWith(".dicom") ||
        !file.name.includes(".") // DICOM files often have no extension
    );

    if (dicomFiles.length < newFiles.length) {
      toast({
        title: "Some files skipped",
        description: "Only DICOM files (.dcm, .dicom, or no extension) are accepted.",
        variant: "destructive",
      });
    }

    const newFileEntries: FileWithStatus[] = dicomFiles.map((file) => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      status: "validating",
    }));

    setFiles((prev) => [...prev, ...newFileEntries]);

    // Validate each file to extract metadata
    for (const fileEntry of newFileEntries) {
      try {
        const formData = new FormData();
        formData.append("file", fileEntry.file);

        const response = await makeD2dRequest('/api/dicom/validate', {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Validation response for', fileEntry.file.name, ':', data);
          
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileEntry.id
                ? {
                    ...f,
                    status: "validated",
                    metadata: {
                      patient_name: data.patient_name,
                      patient_id: data.patient_id,
                      study_description: data.study_description,
                      study_date: data.study_date,
                      modality: data.modality,
                      series_description: data.series_description,
                      sop_class: data.sop_class,
                    },
                  }
                : f
            )
          );
        } else {
          const errorData = await response.json().catch(() => ({}));
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileEntry.id
                ? {
                    ...f,
                    status: "error",
                    message: errorData.detail || "Invalid DICOM file",
                  }
                : f
            )
          );
        }
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileEntry.id
              ? {
                  ...f,
                  status: "error",
                  message: "Validation failed",
                }
              : f
          )
        );
      }
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
    setUploadResults([]);
    setUploadProgress(0);
  };

  // Validate file function - kept for potential future use
  const _validateFile = async (file: File): Promise<DicomMetadata | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await makeD2dRequest('/api/dicom/validate', {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return {
          patient_name: data.patient_name,
          patient_id: data.patient_id,
          study_description: data.study_description,
          study_date: data.study_date,
          modality: data.modality,
          series_description: data.series_description,
          sop_class: data.sop_class,
        };
      }
    } catch (error) {
      console.error("Validation error:", error);
    }
    return null;
  };
  void _validateFile; // Suppress unused warning - available for future use

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select DICOM files to upload.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDestination) {
      toast({
        title: "No destination selected",
        description: "Please select a PACS destination.",
        variant: "destructive",
      });
      return;
    }

    // Find the full destination object from the name
    const destination = destinations.find(d => d.name === selectedDestination);
    if (!destination) {
      toast({
        title: "Invalid destination",
        description: "Selected destination not found",
        variant: "destructive",
      });
      console.error('Destination not found:', selectedDestination);
      return;
    }

    console.log('Upload starting with destination:', JSON.stringify(destination, null, 2));

    setIsUploading(true);
    setUploadResults([]);
    setUploadProgress(0);

    const results: UploadResult[] = [];
    const filesToUpload = files.filter(f => f.status === "validated");
    const totalFiles = filesToUpload.length;

    for (let i = 0; i < filesToUpload.length; i++) {
      const fileEntry = filesToUpload[i];
      
      // Update status to uploading
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileEntry.id ? { ...f, status: "uploading" } : f
        )
      );

      try {
        const formData = new FormData();
        formData.append("files", fileEntry.file);
        
        // Stringify destination as JSON
        const destinationJson = JSON.stringify(destination);
        console.log('Appending destination to FormData:', destinationJson);
        formData.append("destination", destinationJson);

        console.log('Uploading file:', fileEntry.file.name);

        const response = await makeD2dRequest('/api/dicom/upload', {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        console.log('Upload response:', data);
        
        if (response.ok && data.results?.[0]) {
          const result = data.results[0];
          results.push(result);
          
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileEntry.id
                ? {
                    ...f,
                    status: result.success ? "success" : "error",
                    message: result.message,
                  }
                : f
            )
          );
        } else {
          results.push({
            filename: fileEntry.file.name,
            success: false,
            message: data.detail || "Upload failed",
          });
          
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileEntry.id
                ? { ...f, status: "error", message: data.detail || "Upload failed" }
                : f
            )
          );
        }
      } catch (error) {
        results.push({
          filename: fileEntry.file.name,
          success: false,
          message: error instanceof Error ? error.message : "Upload failed",
        });
        
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileEntry.id
              ? { ...f, status: "error", message: "Network error" }
              : f
          )
        );
      }

      setUploadProgress(((i + 1) / totalFiles) * 100);
    }

    setUploadResults(results);
    setIsUploading(false);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    toast({
      title: "Upload Complete",
      description: `${successCount} files sent successfully${failCount > 0 ? `, ${failCount} failed` : ""}`,
      variant: successCount === results.length ? "default" : "destructive",
    });
  };

  const successCount = files.filter((f) => f.status === "success").length;
  const errorCount = files.filter((f) => f.status === "error").length;
  const validatedCount = files.filter((f) => f.status === "validated").length;
  const validatingCount = files.filter((f) => f.status === "validating").length;

  return (
    <div className="space-y-4">
      {/* Step 1: Select Files */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
            1
          </div>
          <h3 className="font-semibold text-foreground">Select DICOM Files</h3>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <HardDrive className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-foreground font-medium mb-2">
            Drag and drop DICOM files here
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            From external CDs, USBs, or downloaded from other PACS systems
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".dcm,.dicom,*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Browse Files
          </Button>
        </div>

        {files.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                {files.length} file{files.length !== 1 ? "s" : ""} selected
                {validatingCount > 0 && (
                  <span className="text-amber-600 ml-2">
                    ({validatingCount} validating)
                  </span>
                )}
                {validatedCount > 0 && (
                  <span className="text-primary ml-2">
                    ({validatedCount} ready)
                  </span>
                )}
                {successCount > 0 && (
                  <span className="text-green-600 ml-2">
                    ({successCount} sent)
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="text-red-600 ml-2">
                    ({errorCount} failed)
                  </span>
                )}
              </span>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {files.map((fileEntry) => (
                <div
                  key={fileEntry.id}
                  className={`p-3 rounded-md ${
                    fileEntry.status === "success"
                      ? "bg-green-50 dark:bg-green-950/20"
                      : fileEntry.status === "error"
                      ? "bg-red-50 dark:bg-red-950/20"
                      : fileEntry.status === "uploading"
                      ? "bg-blue-50 dark:bg-blue-950/20"
                      : fileEntry.status === "validating"
                      ? "bg-amber-50 dark:bg-amber-950/20"
                      : fileEntry.status === "validated"
                      ? "bg-primary/5"
                      : "bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {fileEntry.status === "validating" ? (
                      <Loader2 className="w-4 h-4 text-amber-600 animate-spin flex-shrink-0" />
                    ) : fileEntry.status === "uploading" ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
                    ) : fileEntry.status === "success" ? (
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : fileEntry.status === "error" ? (
                      <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    ) : fileEntry.status === "validated" ? (
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    ) : (
                      <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {fileEntry.file.name}
                      </p>
                      {fileEntry.message && (
                        <p className="text-xs text-muted-foreground truncate">
                          {fileEntry.message}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {(fileEntry.file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    {(fileEntry.status === "validated" || fileEntry.status === "validating") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => removeFile(fileEntry.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* DICOM Metadata Preview */}
                  {fileEntry.status === "validated" && fileEntry.metadata && (
                    <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {fileEntry.metadata.patient_name && (
                        <div>
                          <span className="text-muted-foreground">Patient:</span>{" "}
                          <span className="font-medium text-foreground">{fileEntry.metadata.patient_name}</span>
                        </div>
                      )}
                      {fileEntry.metadata.patient_id && (
                        <div>
                          <span className="text-muted-foreground">ID:</span>{" "}
                          <span className="font-medium text-foreground">{fileEntry.metadata.patient_id}</span>
                        </div>
                      )}
                      {fileEntry.metadata.modality && (
                        <div>
                          <span className="text-muted-foreground">Modality:</span>{" "}
                          <span className="font-medium text-foreground">{fileEntry.metadata.modality}</span>
                        </div>
                      )}
                      {fileEntry.metadata.study_date && (
                        <div>
                          <span className="text-muted-foreground">Date:</span>{" "}
                          <span className="font-medium text-foreground">{fileEntry.metadata.study_date}</span>
                        </div>
                      )}
                      {fileEntry.metadata.study_description && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Study:</span>{" "}
                          <span className="font-medium text-foreground">{fileEntry.metadata.study_description}</span>
                        </div>
                      )}
                      {fileEntry.metadata.series_description && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Series:</span>{" "}
                          <span className="font-medium text-foreground">{fileEntry.metadata.series_description}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {fileEntry.status === "validating" && (
                    <p className="mt-1 text-xs text-amber-600">Reading DICOM metadata...</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Step 2: Select Destination */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
            2
          </div>
          <h3 className="font-semibold text-foreground">Select Destination</h3>
        </div>

        <div className="flex items-center gap-4">
          <Select
            value={selectedDestination}
            onValueChange={setSelectedDestination}
            disabled={isLoadingDestinations}
          >
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select PACS destination..." />
            </SelectTrigger>
            <SelectContent>
              {destinations.map((dest) => (
                <SelectItem key={dest.name} value={dest.name}>
                  {dest.name} ({dest.ae_title} @ {dest.host}:{dest.port})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDestinations}
            disabled={isLoadingDestinations}
          >
            {isLoadingDestinations ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Refresh"
            )}
          </Button>
        </div>

        {destinations.length === 0 && !isLoadingDestinations && (
          <div className="flex items-center gap-2 mt-3 text-sm text-amber-600">
            <AlertCircle className="w-4 h-4" />
            <span>No destinations configured. Configure destinations in the D2D app.</span>
          </div>
        )}
      </Card>

      {/* Step 3: Upload */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
            3
          </div>
          <h3 className="font-semibold text-foreground">Upload & Send</h3>
        </div>

        {isUploading && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Uploading...</span>
              <span className="text-foreground font-medium">
                {Math.round(uploadProgress)}%
              </span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={isUploading || files.length === 0 || validatedCount === 0 || validatingCount > 0}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : validatingCount > 0 ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Validating Files...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload {validatedCount > 0 ? `${validatedCount} ` : ""}File{validatedCount !== 1 ? "s" : ""} to PACS
            </>
          )}
        </Button>

        {uploadResults.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50">
            <h4 className="font-medium text-foreground mb-2">Results</h4>
            <div className="space-y-1">
              {uploadResults.map((result, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {result.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className={result.success ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
                    {result.filename}: {result.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
