import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function UserAccountsList() {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        User accounts list is not available in single-tenant mode.
      </AlertDescription>
    </Alert>
  );
}
