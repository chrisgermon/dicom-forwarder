import { useState, useEffect } from "react";
import { Upload, FileText, Trash2, Download, Building2, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface Brand {
  id: string;
  display_name: string;
}

interface RosterFile {
  id: string;
  brand_id: string;
  roster_type: "radiologist" | "staff";
  file_name: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
  updated_at: string;
}

export default function Rosters() {
  const { user } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [rosterFiles, setRosterFiles] = useState<RosterFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  // Load brands on mount
  useEffect(() => {
    loadBrands();
  }, []);

  // Load roster files when brand changes
  useEffect(() => {
    if (selectedBrandId) {
      loadRosterFiles(selectedBrandId);
    } else {
      setRosterFiles([]);
    }
  }, [selectedBrandId]);

  const loadBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("id, display_name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error("Error loading brands:", error);
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  const loadRosterFiles = async (brandId: string) => {
    try {
      const { data, error } = await supabase
        .from("roster_files")
        .select("*")
        .eq("brand_id", brandId);

      if (error) throw error;
      setRosterFiles((data as RosterFile[]) || []);
    } catch (error) {
      console.error("Error loading roster files:", error);
      toast.error("Failed to load roster files");
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    rosterType: "radiologist" | "staff"
  ) => {
    const file = event.target.files?.[0];
    if (!file || !selectedBrandId || !user) return;

    // Check file type - only PDFs
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf')) {
      toast.error("Please upload a PDF file");
      return;
    }

    setUploading(rosterType);

    try {
      // Upload file to storage
      const filePath = `${selectedBrandId}/${rosterType}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("roster-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Check if a record already exists for this brand and roster type
      const existingFile = rosterFiles.find(
        (rf) => rf.brand_id === selectedBrandId && rf.roster_type === rosterType
      );

      if (existingFile) {
        // Delete old file from storage
        await supabase.storage.from("roster-files").remove([existingFile.file_path]);

        // Update existing record
        const { error: updateError } = await supabase
          .from("roster_files")
          .update({
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingFile.id);

        if (updateError) throw updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from("roster_files")
          .insert({
            brand_id: selectedBrandId,
            roster_type: rosterType,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            uploaded_by: user.id,
          });

        if (insertError) throw insertError;
      }

      toast.success(
        `${rosterType === "radiologist" ? "Radiologist" : "Staff"} roster uploaded successfully`
      );
      loadRosterFiles(selectedBrandId);
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    } finally {
      setUploading(null);
      // Reset the input
      event.target.value = "";
    }
  };

  const handleView = async (rosterFile: RosterFile) => {
    try {
      const { data, error } = await supabase.storage
        .from("roster-files")
        .createSignedUrl(rosterFile.file_path, 3600); // 1 hour expiry

      if (error) throw error;

      // Open PDF in new tab
      window.open(data.signedUrl, "_blank");
    } catch (error) {
      console.error("Error viewing file:", error);
      toast.error("Failed to open file");
    }
  };

  const handleDownload = async (rosterFile: RosterFile) => {
    try {
      const { data, error } = await supabase.storage
        .from("roster-files")
        .download(rosterFile.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = rosterFile.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
  };

  const handleDelete = async (rosterFile: RosterFile) => {
    if (!confirm(`Are you sure you want to delete ${rosterFile.file_name}?`)) return;

    try {
      // Delete from storage
      await supabase.storage.from("roster-files").remove([rosterFile.file_path]);

      // Delete database record
      const { error } = await supabase
        .from("roster_files")
        .delete()
        .eq("id", rosterFile.id);

      if (error) throw error;

      toast.success("Roster file deleted");
      loadRosterFiles(selectedBrandId);
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    }
  };

  const getRosterFile = (type: "radiologist" | "staff") => {
    return rosterFiles.find((rf) => rf.roster_type === type);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const selectedBrand = brands.find((b) => b.id === selectedBrandId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Rosters</h1>
          <p className="text-muted-foreground">
            Upload and manage radiologist and staff rosters by brand
          </p>
        </div>
      </div>

      {/* Brand Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Select Brand
          </CardTitle>
          <CardDescription>
            Choose a brand to view or upload rosters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select a brand..." />
            </SelectTrigger>
            <SelectContent>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Roster Cards */}
      {selectedBrandId && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Radiologist Roster */}
          <RosterCard
            title="Radiologist Roster"
            description="Upload the radiologist schedule roster (PDF only)"
            rosterType="radiologist"
            rosterFile={getRosterFile("radiologist")}
            uploading={uploading === "radiologist"}
            onUpload={(e) => handleFileUpload(e, "radiologist")}
            onView={handleView}
            onDownload={handleDownload}
            onDelete={handleDelete}
            formatFileSize={formatFileSize}
            brandName={selectedBrand?.display_name}
          />

          {/* Staff Roster */}
          <RosterCard
            title="Staff Roster"
            description="Upload the staff schedule roster (PDF only)"
            rosterType="staff"
            rosterFile={getRosterFile("staff")}
            uploading={uploading === "staff"}
            onUpload={(e) => handleFileUpload(e, "staff")}
            onView={handleView}
            onDownload={handleDownload}
            onDelete={handleDelete}
            formatFileSize={formatFileSize}
            brandName={selectedBrand?.display_name}
          />
        </div>
      )}

      {!selectedBrandId && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Brand Selected</h3>
            <p className="text-muted-foreground max-w-md">
              Select a brand above to view and manage roster files for that brand.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface RosterCardProps {
  title: string;
  description: string;
  rosterType: "radiologist" | "staff";
  rosterFile: RosterFile | undefined;
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onView: (file: RosterFile) => void;
  onDownload: (file: RosterFile) => void;
  onDelete: (file: RosterFile) => void;
  formatFileSize: (bytes: number | null) => string;
  brandName?: string;
}

function RosterCard({
  title,
  description,
  rosterType,
  rosterFile,
  uploading,
  onUpload,
  onView,
  onDownload,
  onDelete,
  formatFileSize,
  brandName,
}: RosterCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rosterFile ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <FileText className="h-8 w-8 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{rosterFile.file_name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(rosterFile.file_size)} • Updated{" "}
                  {format(new Date(rosterFile.updated_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={() => onView(rosterFile)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onDownload(rosterFile)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(rosterFile)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <input
                type="file"
                id={`replace-${rosterType}`}
                className="hidden"
                onChange={onUpload}
                accept=".pdf"
              />
              <label htmlFor={`replace-${rosterType}`}>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full cursor-pointer"
                  disabled={uploading}
                  asChild
                >
                  <span>
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {uploading ? "Uploading..." : "Replace File"}
                  </span>
                </Button>
              </label>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              No {rosterType} roster uploaded for {brandName}
            </p>
            <div className="relative">
              <input
                type="file"
                id={`upload-${rosterType}`}
                className="hidden"
                onChange={onUpload}
                accept=".pdf"
              />
              <label htmlFor={`upload-${rosterType}`}>
                <Button
                  variant="default"
                  size="sm"
                  className="cursor-pointer"
                  disabled={uploading}
                  asChild
                >
                  <span>
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {uploading ? "Uploading..." : "Upload Roster"}
                  </span>
                </Button>
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              PDF files only
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
