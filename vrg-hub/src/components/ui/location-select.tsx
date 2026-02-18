import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function LocationSelect() {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Location select is not available in single-tenant mode.
      </AlertDescription>
    </Alert>
  );
}
