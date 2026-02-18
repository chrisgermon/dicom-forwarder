import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Newspaper } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserNews } from "@/hooks/useUserNews";

export function NewsUpdatesCard() {
  const { data: articles, isLoading } = useUserNews(3);
  return (
    <Card variant="glass" className="h-full bg-card dark:bg-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" strokeWidth={1.5} />
          News & Updates
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : articles && articles.length > 0 ? (
          <div className="space-y-3">
            {articles.map((article) => (
              <Link
                key={article.id}
                to={`/news/${article.id}`}
                className="block p-2 -mx-1 rounded-lg hover:bg-muted/60 transition-colors duration-100 group"
              >
                <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-100 line-clamp-2">
                  {article.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {article.published_at && format(new Date(article.published_at), "MMM d, yyyy")}
                </p>
              </Link>
            ))}
            <Link
              to="/news"
              className="block text-sm text-primary hover:underline font-medium pt-2"
            >
              View All →
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No news available</p>
        )}
      </CardContent>
    </Card>
  );
}
