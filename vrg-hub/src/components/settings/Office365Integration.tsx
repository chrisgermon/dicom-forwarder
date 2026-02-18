import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function Office365Integration() {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Office 365 integration is not available in single-tenant mode.
      </AlertDescription>
    </Alert>
  );
}
