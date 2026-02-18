import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function SharedClinic() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Shared Clinic</h1>
        <p className="text-muted-foreground">
          Share clinic information with partners
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shared Clinic</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Shared clinic features are not available in single-tenant mode.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
