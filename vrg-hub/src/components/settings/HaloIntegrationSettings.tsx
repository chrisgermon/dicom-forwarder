import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function HaloIntegrationSettings() {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Halo integration settings are not available in single-tenant mode.
      </AlertDescription>
    </Alert>
  );
}
