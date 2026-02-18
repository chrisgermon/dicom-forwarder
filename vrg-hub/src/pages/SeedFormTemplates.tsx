import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

export default function SeedFormTemplates() {
  return (
    <PageContainer maxWidth="xl" className="space-y-6">
      <PageHeader
        title="Seed Form Templates"
        description="Initialize form templates"
      />

      <Card>
        <CardHeader>
          <CardTitle>Seed Form Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Form template seeding is not available in single-tenant mode.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
