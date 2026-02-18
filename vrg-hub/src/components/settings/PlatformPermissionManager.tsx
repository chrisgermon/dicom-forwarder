import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function PlatformPermissionManager() {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Platform permission manager is not available in single-tenant mode.
      </AlertDescription>
    </Alert>
  );
}
