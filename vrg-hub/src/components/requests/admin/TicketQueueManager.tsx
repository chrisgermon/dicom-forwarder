import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function TicketQueueManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket Queue Manager</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            The advanced ticket queue manager has been simplified. Please use the unified requests list to view and manage all tickets.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
