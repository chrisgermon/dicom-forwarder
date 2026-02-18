import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface ResultDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: any;
  query: string;
}

export function ResultDetailsDialog({
  open,
  onOpenChange,
  result,
  query,
}: ResultDetailsDialogProps) {
  const [details, setDetails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch detailed data when dialog opens
  const fetchDetails = async () => {
    if (!result) return;

    setIsLoading(true);
    try {
      // Build a detailed query based on the clicked result
      const detailQuery = buildDetailQuery(result, query);

      const { data, error } = await supabase.functions.invoke("executive-ai-query", {
        body: { query: detailQuery },
      });

      if (error) throw error;

      setDetails(data.results || []);
    } catch (error) {
      console.error("Error fetching details:", error);
      setDetails([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Build a detailed query based on the result row
  const buildDetailQuery = (row: any, _originalQuery: string): string => {
    // Extract key fields from the result
    const radiologist = row.RadiologistName || row.radiologist_name;
    const worksite = row.WorkSiteName || row.worksite_name;
    const date = row.InvoiceDate || row.invoice_date || row.ServiceDate || row.service_date;

    // Build detailed query
    let detailQuery = "Show me detailed procedure breakdown";

    if (radiologist) {
      detailQuery += ` for ${radiologist}`;
    }

    if (worksite) {
      detailQuery += ` at ${worksite}`;
    }

    if (date) {
      detailQuery += ` on ${date}`;
    }

    detailQuery += " including procedure codes, modality, and revenue for each service";

    return detailQuery;
  };

  // Handle dialog opening
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !details.length) {
      fetchDetails();
    }
    onOpenChange(newOpen);
  };

  // Format currency
  const formatCurrency = (value: any) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return `$${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!details.length) return;

    const headers = Object.keys(details[0]).join(",");
    const rows = details.map((row) =>
      Object.values(row)
        .map((val) => `"${val}"`)
        .join(",")
    );
    const csv = [headers, ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `details-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Get title from result
  const getTitle = () => {
    if (!result) return "Details";

    const radiologist = result.RadiologistName || result.radiologist_name;
    const worksite = result.WorkSiteName || result.worksite_name;

    if (radiologist) return `Details for ${radiologist}`;
    if (worksite) return `Details for ${worksite}`;
    return "Procedure Details";
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{getTitle()}</span>
            {details.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                className="ml-4"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            Detailed breakdown of procedures and revenue
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : details.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <p>No detailed data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr className="border-b">
                    {Object.keys(details[0]).map((key) => (
                      <th
                        key={key}
                        className="text-left py-3 px-4 font-semibold text-xs uppercase whitespace-nowrap"
                      >
                        {key.replace(/_/g, " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {details.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b hover:bg-accent/5 transition-colors"
                    >
                      {Object.entries(row).map(([key, value], cellIdx) => {
                        const lowerKey = key.toLowerCase();
                        const isCurrency = lowerKey.includes("revenue") ||
                          lowerKey.includes("amount") ||
                          lowerKey.includes("fee") ||
                          lowerKey.includes("total") ||
                          lowerKey.includes("price") ||
                          lowerKey.includes("cost") ||
                          lowerKey.includes("payment");

                        return (
                          <td key={cellIdx} className="py-3 px-4 whitespace-nowrap">
                            {typeof value === "number" && isCurrency
                              ? formatCurrency(value)
                              : typeof value === "number"
                              ? Number(value).toLocaleString()
                              : String(value || "-")}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="py-3 px-4 text-xs text-muted-foreground border-t bg-muted/30">
                Showing {details.length} record{details.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
