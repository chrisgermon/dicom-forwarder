import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, BookOpen, Plus, FolderPlus, Edit, Trash2, MoreVertical } from 'lucide-react';
import { TabsContent } from '@/components/ui/tabs';
import { UnderlineTabs, UnderlineTabsList, UnderlineTabsTrigger } from '@/components/ui/underline-tabs';
import { VideoLibrary } from '@/components/knowledge-base/VideoLibrary';
import { KnowledgeBaseCategoryDialog } from '@/components/knowledge-base/KnowledgeBaseCategoryDialog';
import { KnowledgeBasePageDialog } from '@/components/knowledge-base/KnowledgeBasePageDialog';
import { ArticleManagement } from '@/components/knowledge-base/ArticleManagement';
import { ArticleEditor } from '@/components/knowledge-base/ArticleEditor';
import { useAccessControl } from '@/hooks/useAccessControl';
import { EditCategoryDialog } from '@/components/knowledge-base/EditCategoryDialog';
import { DeleteCategoryDialog } from '@/components/knowledge-base/DeleteCategoryDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; description?: string; icon?: string } | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<{ id: string; name: string } | null>(null);
  const { isTenantAdmin, isSuperAdmin } = useAccessControl();
  const isAdmin = isTenantAdmin || isSuperAdmin;

  const { data: categories = [], refetch: refetchCategories } = useQuery({
    queryKey: ['kb-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data || [];
    },
  });

  const { data: pages = [], refetch: refetchPages } = useQuery({
    queryKey: ['kb-pages', searchQuery, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('kb_pages')
        .select('*');

      if (!isAdmin) {
        query = query.eq('is_published', true);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(20);

      if (error) throw error;
      return data || [];
    },
  });

  if (editingArticleId) {
    return <ArticleEditor articleId={editingArticleId} onBack={() => setEditingArticleId(null)} />;
  }

  return (
    <PageContainer maxWidth="xl" className="space-y-6">
      <PageHeader
        title="Knowledge Base"
        description="Find answers, documentation, and how-to videos"
        actions={
          isAdmin && (
            <div className="flex gap-2">
              <Button onClick={() => setCategoryDialogOpen(true)} variant="outline">
                <FolderPlus className="h-4 w-4 mr-2" />
                New Category
              </Button>
              <Button onClick={() => setPageDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Article
              </Button>
            </div>
          )
        }
      />

      <UnderlineTabs defaultValue="articles" className="w-full">
        <UnderlineTabsList>
          <UnderlineTabsTrigger value="articles">Articles</UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="videos">Video Library</UnderlineTabsTrigger>
        </UnderlineTabsList>

        <TabsContent value="articles" className="space-y-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

      {!searchQuery && categories.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Categories</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Card key={category.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      {category.name}
                    </CardTitle>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setEditingCategory({
                              id: category.id,
                              name: category.name,
                              description: category.description,
                              icon: category.icon
                            });
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingCategory({ id: category.id, name: category.name });
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                {category.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">
          {searchQuery ? 'Search Results' : isAdmin ? 'All Articles' : 'Recent Articles'}
        </h2>
        {isAdmin ? (
          <ArticleManagement
            articles={pages}
            onEdit={setEditingArticleId}
            onRefresh={refetchPages}
          />
        ) : (
          <div className="space-y-4">
            {pages.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {searchQuery ? 'No articles found matching your search' : 'No articles available yet'}
                </CardContent>
              </Card>
            ) : (
              pages.map((page) => (
                <Card key={page.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>{page.title}</CardTitle>
                  </CardHeader>
                  {page.excerpt && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{page.excerpt}</p>
                      <Button variant="link" className="px-0 mt-2">
                        Read more →
                      </Button>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        )}
          </div>
        </TabsContent>

        <TabsContent value="videos">
          <VideoLibrary />
        </TabsContent>
      </UnderlineTabs>

      <KnowledgeBaseCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onSuccess={() => {
          refetchCategories();
          refetchPages();
        }}
      />

      <KnowledgeBasePageDialog
        open={pageDialogOpen}
        onOpenChange={setPageDialogOpen}
        categoryId={null}
        subcategoryId={null}
        onSuccess={(pageId) => {
          refetchPages();
          setEditingArticleId(pageId);
        }}
      />

      {editingCategory && (
        <EditCategoryDialog
          open={!!editingCategory}
          onOpenChange={(open) => !open && setEditingCategory(null)}
          categoryId={editingCategory.id}
          categoryName={editingCategory.name}
          categoryDescription={editingCategory.description}
          categoryIcon={editingCategory.icon}
          onSuccess={() => {
            refetchCategories();
            setEditingCategory(null);
          }}
        />
      )}

      {deletingCategory && (
        <DeleteCategoryDialog
          open={!!deletingCategory}
          onOpenChange={(open) => !open && setDeletingCategory(null)}
          categoryId={deletingCategory.id}
          categoryName={deletingCategory.name}
          onSuccess={() => {
            refetchCategories();
            setDeletingCategory(null);
          }}
        />
      )}
    </PageContainer>
  );
}
