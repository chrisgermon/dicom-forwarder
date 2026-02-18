import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
  name: string;
  email: string;
  position?: string;
  department?: string;
  phone?: string;
  mobile?: string;
  office_location?: string;
}

interface ExportDirectoryButtonProps {
  users: User[];
}

export function ExportDirectoryButton({ users }: ExportDirectoryButtonProps) {
  const { toast } = useToast();

  const handleExport = () => {
    if (!users || users.length === 0) {
      toast({
        title: "No Data",
        description: "There are no users to export.",
        variant: "destructive",
      });
      return;
    }

    // Create CSV content
    const headers = ["Name", "Email", "Department", "Position", "Phone", "Mobile", "Office Location"];
    const rows = users.map(user => [
      user.name || "",
      user.email || "",
      user.department || "",
      user.position || "",
      user.phone || "",
      user.mobile || "",
      user.office_location || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Create download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `company-directory-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Exported ${users.length} users to CSV.`,
    });
  };

  return (
    <Button onClick={handleExport} variant="outline" size="sm">
      <Download className="w-4 h-4 mr-2" />
      Export CSV
    </Button>
  );
}
