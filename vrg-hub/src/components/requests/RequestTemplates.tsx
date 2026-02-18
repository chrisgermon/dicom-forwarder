import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function RequestTemplates() {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Request templates are not available in single-tenant mode.
      </AlertDescription>
    </Alert>
  );
}
