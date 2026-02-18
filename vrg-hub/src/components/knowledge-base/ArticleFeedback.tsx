import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function ArticleFeedback({ pageId: _pageId }: { pageId: string }) { void _pageId;
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Article feedback is not available in single-tenant mode.
      </AlertDescription>
    </Alert>
  );
}