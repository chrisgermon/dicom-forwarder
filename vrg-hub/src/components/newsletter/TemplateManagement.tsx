import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Layout } from 'lucide-react';
import { DepartmentTemplateEditor } from './DepartmentTemplateEditor';

export function TemplateManagement() {
  return (
    <Tabs defaultValue="sections" className="w-full">
      <TabsList>
        <TabsTrigger value="sections">
          <Layout className="h-4 w-4 mr-2" />
          Department Sections
        </TabsTrigger>
        <TabsTrigger value="email">
          <FileText className="h-4 w-4 mr-2" />
          Email Templates
        </TabsTrigger>
      </TabsList>

      <TabsContent value="sections" className="space-y-4">
        <DepartmentTemplateEditor />
      </TabsContent>

      <TabsContent value="email" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Email Templates</CardTitle>
            <CardDescription>
              Manage newsletter email templates (coming soon)
            </CardDescription>
          </CardHeader>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
