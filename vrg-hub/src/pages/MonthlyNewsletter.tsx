import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TabsContent } from "@/components/ui/tabs";
import { UnderlineTabs, UnderlineTabsList, UnderlineTabsTrigger } from "@/components/ui/underline-tabs";
import { Button } from "@/components/ui/button";
import { FileText, Settings, BookOpen, Loader2 } from "lucide-react";
import { ContributorDashboard } from "@/components/newsletter/ContributorDashboard";
import { AdminDashboard } from "@/components/newsletter/AdminDashboard";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

export default function MonthlyNewsletter() {
  const { user } = useAuth();
  const [isEditor, setIsEditor] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkEditorRole();
  }, [user]);

  const checkEditorRole = async () => {
    if (!user) return;

    try {
      const { data: roles, error } = await supabase
        .from("rbac_user_roles")
        .select(`
          role:rbac_roles(name)
        `)
        .eq("user_id", user.id);

      console.log("Newsletter - User roles:", roles);
      console.log("Newsletter - Query error:", error);

      const hasEditorRole = roles?.some((r: any) =>
        ["manager", "tenant_admin", "super_admin", "newsletter_admin"].includes(r.role?.name)
      );
      
      console.log("Newsletter - Has editor role:", hasEditorRole);
      setIsEditor(hasEditorRole || false);
    } catch (error) {
      console.error("Error checking role:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer maxWidth="xl" className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="xl" className="space-y-6">
      <PageHeader
        title="Monthly Newsletter"
        description="Collaborate on the company monthly newsletter"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/docs/NEWSLETTER_GUIDE.md', '_blank')}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            View Guide
          </Button>
        }
      />

      {isEditor ? (
        // Editors see both tabs - My Tasks and Admin
        <UnderlineTabs defaultValue="my-tasks" className="w-full">
          <UnderlineTabsList>
            <UnderlineTabsTrigger value="my-tasks">
              <FileText className="h-4 w-4 mr-2" />
              My Tasks
            </UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="admin">
              <Settings className="h-4 w-4 mr-2" />
              Admin
            </UnderlineTabsTrigger>
          </UnderlineTabsList>

          <TabsContent value="my-tasks" className="space-y-4">
            <ContributorDashboard />
          </TabsContent>

          <TabsContent value="admin" className="space-y-4">
            <AdminDashboard />
          </TabsContent>
        </UnderlineTabs>
      ) : (
        // Regular contributors just see their tasks directly - no tabs needed
        <ContributorDashboard />
      )}
    </PageContainer>
  );
}
