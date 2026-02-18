import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface KnowledgeBasePageListProps {
  categoryId: string | null;
  subcategoryId: string | null;
  searchQuery: string;
  onSelectPage: (pageId: string) => void;
  showTemplates?: boolean;
}

export function KnowledgeBasePageList(_props: KnowledgeBasePageListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Knowledge Base Pages</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Knowledge base pages are not available in single-tenant mode.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
