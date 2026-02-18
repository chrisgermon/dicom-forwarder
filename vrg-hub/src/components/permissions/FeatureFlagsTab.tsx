import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface FeatureFlagsTabProps {
  companyId: string;
  searchTerm: string;
}

export function FeatureFlagsTab(_props: FeatureFlagsTabProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Feature flags are not available in single-tenant mode.
        </AlertDescription>
      </Alert>
    </div>
  );
}
