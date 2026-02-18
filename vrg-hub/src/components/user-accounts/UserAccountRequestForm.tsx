import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function UserAccountRequestForm() {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        User account request form is not available in single-tenant mode.
      </AlertDescription>
    </Alert>
  );
}
