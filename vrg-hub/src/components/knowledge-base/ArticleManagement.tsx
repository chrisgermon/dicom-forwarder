import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, Eye, EyeOff, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Article {
  id: string;
  title: string;
  excerpt: string | null;
  is_published: boolean;
  created_at: string;
}

interface ArticleManagementProps {
  articles: Article[];
  onEdit: (articleId: string) => void;
  onRefresh: () => void;
}

export function ArticleManagement({ articles, onEdit, onRefresh }: ArticleManagementProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleTogglePublish = async (articleId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("kb_pages")
        .update({ is_published: !currentStatus, published_at: !currentStatus ? new Date().toISOString() : null })
        .eq("id", articleId);

      if (error) throw error;

      toast.success(currentStatus ? "Article unpublished" : "Article published");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("kb_pages")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast.success("Article deleted successfully");
      setDeleteId(null);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleExport = async (articleId: string) => {
    try {
      const { data, error } = await supabase
        .from("kb_pages")
        .select("*")
        .eq("id", articleId)
        .single();

      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.slug || "article"}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Article exported successfully");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {articles.map((article) => (
          <Card key={article.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{article.title}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleTogglePublish(article.id, article.is_published)}
                  >
                    {article.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleExport(article.id)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(article.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteId(article.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            {article.excerpt && (
              <CardContent>
                <p className="text-sm text-muted-foreground">{article.excerpt}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Status: {article.is_published ? "Published" : "Draft"}
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this article? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
