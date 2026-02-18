import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface RolePermissionsTabProps {
  companyId: string;
  searchTerm: string;
}

export function RolePermissionsTab(_props: RolePermissionsTabProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Role permissions management is not available in single-tenant mode.
        </AlertDescription>
      </Alert>
    </div>
  );
}
