import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function ComprehensivePermissionManager() {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Comprehensive permission manager is not available in single-tenant mode.
      </AlertDescription>
    </Alert>
  );
}
