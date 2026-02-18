import { TabsContent } from "@/components/ui/tabs";
import { UnderlineTabs, UnderlineTabsList, UnderlineTabsTrigger } from "@/components/ui/underline-tabs";
import { PageContainer } from "@/components/ui/page-container";
import ArticlesList from "@/components/news/ArticlesList";
import ArticlePermissionsManager from "@/components/news/ArticlePermissionsManager";
import { useAuth } from "@/hooks/useAuth";

export default function NewsManagement() {
  const { userRole } = useAuth();
  const isAdmin = userRole === "tenant_admin" || userRole === "super_admin";

  return (
    <PageContainer maxWidth="xl">
      <UnderlineTabs defaultValue="articles" className="space-y-6">
        <UnderlineTabsList>
          <UnderlineTabsTrigger value="articles">Articles</UnderlineTabsTrigger>
          {isAdmin && <UnderlineTabsTrigger value="permissions">Permissions</UnderlineTabsTrigger>}
        </UnderlineTabsList>

        <TabsContent value="articles">
          <ArticlesList />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="permissions">
            <ArticlePermissionsManager />
          </TabsContent>
        )}
      </UnderlineTabs>
    </PageContainer>
  );
}