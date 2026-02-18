import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import ranzcrLogo from "@/assets/ranzcr-logo.png";

interface CpdExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function CpdExportDialog({ open, onOpenChange, userId }: CpdExportDialogProps) {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [exporting, setExporting] = useState(false);

  const { data: userProfile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: records, error } = await supabase
        .from("cpd_attendance")
        .select(`
          *,
          category:cpd_categories(name),
          meeting:cpd_meetings(name)
        `)
        .eq("user_id", userId)
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate)
        .order("attendance_date", { ascending: true });

      if (error) throw error;

      const doc = new jsPDF();
      const userName = userProfile?.full_name || "User";

      // Add logo
      const img = new Image();
      img.src = ranzcrLogo;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      doc.addImage(img, "PNG", 14, 10, 30, 30);

      // Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("CPD Attendance Logbook", 120, 20, { align: "center" });

      // Subtitle
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`${userName}`, 120, 30, { align: "center" });
      doc.text(
        `Period: ${format(new Date(startDate), "dd MMM yyyy")} - ${format(new Date(endDate), "dd MMM yyyy")}`,
        120,
        38,
        { align: "center" }
      );

      // Table
      const tableData = (records || []).map((record) => [
        format(new Date(record.attendance_date), "dd/MM/yyyy"),
        record.is_custom ? record.custom_meeting_name : record.meeting?.name || "-",
        record.category?.name || "-",
        record.organisation || "-",
        record.duration_hours.toString(),
        record.cpd_hours_claimed.toString(),
      ]);

      const totalCpdHours = (records || []).reduce((sum, r) => sum + r.cpd_hours_claimed, 0);

      autoTable(doc, {
        startY: 45,
        head: [["Date", "Activity", "Category", "Organisation", "Duration", "CPD Hrs"]],
        body: tableData,
        foot: [["", "", "", "Total:", "", totalCpdHours.toFixed(1)]],
        theme: "grid",
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: "bold",
        },
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: 0,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 50 },
          2: { cellWidth: 35 },
          3: { cellWidth: 35 },
          4: { cellWidth: 20, halign: "center" },
          5: { cellWidth: 20, halign: "center" },
        },
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128);
        doc.text(
          `Generated on ${format(new Date(), "dd MMM yyyy HH:mm")}`,
          105,
          doc.internal.pageSize.height - 10,
          { align: "center" }
        );
      }

      doc.save(`CPD_Logbook_${userName.replace(/\s/g, "_")}_${startDate}_to_${endDate}.pdf`);

      toast({
        title: "Success",
        description: "PDF exported successfully",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Export CPD Logbook</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? "Exporting..." : "Export PDF"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
