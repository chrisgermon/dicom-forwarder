import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface NewsArticle {
  id: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
  slug: string | null;
  featured_image_url: string | null;
  brand_id: string | null;
}

export function useUserNews(maxItems: number = 4) {
  const { profile } = useAuth();
  const userBrandId = profile?.brand_id;

  return useQuery({
    queryKey: ['news-articles-user', maxItems, userBrandId],
    queryFn: async () => {
      // Fetch articles that are either company-wide (null brand_id) OR match user's brand
      let query = supabase
        .from('news_articles')
        .select('id, title, excerpt, published_at, slug, featured_image_url, brand_id')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(maxItems);

      const { data, error } = await query;
      if (error) throw error;

      // Filter client-side: show if company-wide (null) OR matches user's brand
      const filtered = (data || []).filter((article: NewsArticle) => {
        // Company-wide articles (null brand_id) are visible to everyone
        if (article.brand_id === null) return true;
        // Brand-specific articles only visible to users of that brand
        if (userBrandId && article.brand_id === userBrandId) return true;
        // If user has no brand set, only show company-wide
        return false;
      });

      return filtered.slice(0, maxItems);
    },
  });
}
