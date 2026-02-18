import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface RelatedArticlesProps {
  pageId: string;
  categoryId: string | null;
  subcategoryId: string | null;
  onSelectPage?: (pageId: string) => void;
}

export function RelatedArticles(_props: RelatedArticlesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Related Articles</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Related articles are not available in single-tenant mode.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
