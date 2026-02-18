import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface RequestFiltersProps {
  onFilterChange?: (filters: any) => void;
}

export function RequestFilters(_props: RequestFiltersProps) {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Request filters are not available in single-tenant mode.
      </AlertDescription>
    </Alert>
  );
}
