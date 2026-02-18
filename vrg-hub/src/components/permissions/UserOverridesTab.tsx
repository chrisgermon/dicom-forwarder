import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface UserOverridesTabProps {
  companyId: string;
  searchTerm: string;
}

export function UserOverridesTab(_props: UserOverridesTabProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          User overrides management is not available in single-tenant mode.
        </AlertDescription>
      </Alert>
    </div>
  );
}
