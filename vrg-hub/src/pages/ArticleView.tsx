import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/ui/page-container';
import { Loader2, ArrowLeft, Calendar, User } from 'lucide-react';
import { formatAUDateTimeFull } from '@/lib/dateUtils';
import { sanitizeRichHtml } from '@/lib/sanitizer';
import { useAuditLog } from '@/hooks/useAuditLog';

export default function ArticleView() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { logView } = useAuditLog();

  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) return;

      try {
        // Fetch article without join
        let query = supabase
          .from('news_articles')
          .select('*')
          .eq('is_published', true);

        // Check if slug is a UUID (for backward compatibility)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(slug)) {
          query = query.eq('id', slug);
        } else {
          query = query.eq('slug', slug);
        }

        const { data, error } = await query.single();

        if (error) throw error;

        // Fetch author profile separately if author_id exists
        if (data && data.author_id) {
          const { data: authorData } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', data.author_id)
            .maybeSingle();

          setArticle({ ...data, author: authorData });
          // Log article view
          logView('news_articles', data.id, { title: data.title, slug: data.slug });
        } else {
          setArticle(data);
          if (data) {
            logView('news_articles', data.id, { title: data.title, slug: data.slug });
          }
        }
      } catch (error) {
        console.error('Error fetching article:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [slug, logView]);

  if (loading) {
    return (
      <PageContainer maxWidth="lg" className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </PageContainer>
    );
  }

  if (!article) {
    return (
      <PageContainer maxWidth="lg">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-2">Article Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The article you're looking for doesn't exist or has been unpublished.
            </p>
            <Button asChild>
              <Link to="/news/view-all">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to News
              </Link>
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="lg">
      <Button asChild variant="ghost" className="mb-6">
        <Link to="/news/view-all">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to News
        </Link>
      </Button>

      <article>
        {article.featured_image_url && (
          <img
            src={article.featured_image_url}
            alt={article.title}
            className="w-full max-h-[300px] object-contain rounded-xl mb-8 bg-muted"
          />
        )}

        <h1 className="text-4xl font-bold mb-4">{article.title}</h1>

        <div className="flex items-center gap-6 text-sm text-muted-foreground mb-8">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>{article.author?.full_name || article.author?.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{formatAUDateTimeFull(article.published_at)}</span>
          </div>
        </div>

        <div
          className="prose prose-slate dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(article.content) }}
        />

        {article.tags && article.tags.length > 0 && (
          <div className="mt-12 pt-8 border-t">
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>
    </PageContainer>
  );
}
