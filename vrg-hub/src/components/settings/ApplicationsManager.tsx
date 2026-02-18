import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function ApplicationsManager() {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Applications manager is not available in single-tenant mode.
      </AlertDescription>
    </Alert>
  );
}
