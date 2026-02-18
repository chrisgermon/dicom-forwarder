import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface DepartmentRequestFormProps {
  department: string;
  departmentLabel: string;
  subDepartments: string[];
  onSuccess?: () => void;
}

export function DepartmentRequestForm({ 
  department: _department, 
  departmentLabel,
  subDepartments: _subDepartments,
  onSuccess: _onSuccess,
}: DepartmentRequestFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{departmentLabel} Request</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Department request forms are not available in single-tenant mode.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
