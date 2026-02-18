import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface KnowledgeBaseCategorySidebarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  selectedSubcategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onSelectSubcategory: (id: string | null) => void;
  onRefresh: () => void;
}

export function KnowledgeBaseCategorySidebar(_props: KnowledgeBaseCategorySidebarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Knowledge base categories are not available in single-tenant mode.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
