import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Newspaper } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserNews } from "@/hooks/useUserNews";

interface NewsFeedModuleProps {
  title?: string;
  maxItems?: number;
}

export function NewsFeedModule({ 
  title = "News", 
  maxItems = 4
}: NewsFeedModuleProps) {
  const { data: articles, isLoading, error } = useUserNews(maxItems);

  if (isLoading) {
    return (
      <Card className="rounded-2xl shadow-md h-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 h-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load news articles.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <Card className="rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 h-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Newspaper className="h-4 w-4" />
            <AlertDescription>
              No news articles published yet.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 h-full border-2 border-primary/20 bg-gradient-to-br from-background to-background/95 hover:border-primary/40 animate-fade-in">
      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Newspaper className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">{title}</CardTitle>
          </div>
          <Link to="/news/view-all" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors hover:underline">
            View All
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {articles.map((article) => (
            <Link
              key={article.id}
              to={`/news/${article.slug || article.id}`}
              className="block group"
            >
              <div className="flex gap-4 items-start p-3 rounded-lg hover:bg-accent/50 transition-all duration-200 -mx-3">
                {article.featured_image_url && (
                  <img 
                    src={article.featured_image_url} 
                    alt={article.title}
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow duration-200 border border-border"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors duration-200">
                    {article.title}
                  </h3>
                  {article.excerpt && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {article.excerpt}
                    </p>
                  )}
                  {article.published_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}