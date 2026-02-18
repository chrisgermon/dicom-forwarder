import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function CompanyRequestPrefixManager() {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Company request prefix manager is not available in single-tenant mode.
      </AlertDescription>
    </Alert>
  );
}
