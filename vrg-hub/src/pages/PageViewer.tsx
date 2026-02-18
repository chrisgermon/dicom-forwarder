import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import DOMPurify from "dompurify";

export default function PageViewer() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isSuperAdmin = (profile as any)?.role === "super_admin";

  useEffect(() => {
    loadPage();
  }, [slug]);

  const loadPage = async () => {
    try {
      const { data, error } = await supabase
        .from("custom_pages")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) throw error;

      if (!data) {
        setError(true);
        return;
      }

      setPage(data);
    } catch (error) {
      console.error("Error loading page:", error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold mb-4">Page Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The page you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const sanitizedContent = DOMPurify.sanitize(page.content);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {isSuperAdmin && (
          <Button
            variant="outline"
            onClick={() => navigate(`/pages/edit?id=${page.id}`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Page
          </Button>
        )}
      </div>

      <article className="prose prose-lg max-w-none">
        <h1>{page.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
      </article>
    </div>
  );
}
