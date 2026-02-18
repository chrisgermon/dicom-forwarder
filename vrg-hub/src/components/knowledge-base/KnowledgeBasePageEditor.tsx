import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface KnowledgeBasePageEditorProps {
  pageId: string;
  onBack: () => void;
}

export function KnowledgeBasePageEditor({ pageId: _pageId, onBack: _onBack }: KnowledgeBasePageEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Page Editor</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Knowledge base page editor is not available in single-tenant mode.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
