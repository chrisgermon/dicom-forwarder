import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function PermissionManager() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Permission Manager</h1>
        <p className="text-muted-foreground">
          Manage permissions and access control
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permission Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Permission manager is not available in single-tenant mode.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
