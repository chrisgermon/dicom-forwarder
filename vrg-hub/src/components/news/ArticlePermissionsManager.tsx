import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function ArticlePermissionsManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Article Management Permissions</CardTitle>
        <CardDescription>
          Grant individual users permission to create and manage news articles
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">Permissions Not Available</h3>
            <p className="text-sm text-muted-foreground mt-2">
              This feature is not available in single-tenant mode.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
