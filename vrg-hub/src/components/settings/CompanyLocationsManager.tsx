import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function CompanyLocationsManager() {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Company locations manager is not available in single-tenant mode.
      </AlertDescription>
    </Alert>
  );
}
