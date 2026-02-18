import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Home as HomeIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

export default function ContentEditor() {
  const navigate = useNavigate();

  return (
    <PageContainer maxWidth="lg" className="space-y-6">
      <PageHeader
        title="Content Editor"
        description="Edit your pages and content directly within CrowdHub"
      />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Inline Content Editing
            </CardTitle>
            <CardDescription>
              Edit content directly on your pages with built-in inline editing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Features</h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Edit content directly on the page (WYSIWYG)</li>
                <li>Click "Edit Inline" to activate inline editing mode</li>
                <li>Changes are saved directly to your database</li>
                <li>No external tools required</li>
                <li>Works seamlessly with your existing content</li>
              </ul>
            </div>

            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">How to Use</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Navigate to the page you want to edit</li>
                <li>Click the "Edit Inline" button</li>
                <li>Click on any text or image to edit it</li>
                <li>Click "Save" when you're done</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Editable Content</CardTitle>
            <CardDescription>
              Pages you can edit with inline editing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <HomeIcon className="w-4 h-4" />
                    Home Page
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Edit hero section, title, subtitle, and background image
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/home")}>
                  Go to Page
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">Advanced Editing</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 dark:text-blue-200">
            <p className="mb-2">For more advanced layout changes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Use the "Advanced Editor" button on the Home page</li>
              <li>Drag and drop widgets to customize your layout</li>
              <li>Add, remove, or rearrange content modules</li>
              <li>Configure widget settings and options</li>
            </ul>
          </CardContent>
        </Card>
    </PageContainer>
  );
}
