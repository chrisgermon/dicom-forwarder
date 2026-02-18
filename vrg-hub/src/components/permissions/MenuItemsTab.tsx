import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface MenuItemsTabProps {
  companyId: string;
  searchTerm: string;
}

export function MenuItemsTab(_props: MenuItemsTabProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Menu items management is not available in single-tenant mode.
        </AlertDescription>
      </Alert>
    </div>
  );
}
