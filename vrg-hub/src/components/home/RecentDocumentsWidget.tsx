import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, ChevronRight } from 'lucide-react';
import { useSharePointRecent } from '@/components/documentation/useSharePointRecent';
import { FileTypeIcon } from '@/components/documentation/FileTypeIcon';
import { formatDistanceToNow } from 'date-fns';

interface RecentDocumentsWidgetProps {
  onViewAll: () => void;
}

export function RecentDocumentsWidget({ onViewAll }: RecentDocumentsWidgetProps) {
  const { recentItems, loading } = useSharePointRecent();

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Recent Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Recent Documents
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewAll}
          className="gap-2"
        >
          View All
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {recentItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No recent documents</p>
          ) : (
            recentItems.slice(0, 5).map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-3 rounded-xl border hover:bg-accent/50 hover:border-accent transition-all duration-200 group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileTypeIcon fileName={item.item_name} className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.item_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.last_accessed_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                {item.item_url && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 opacity-50 group-hover:opacity-100 transition-opacity"
                    onClick={() => window.open(item.item_url!, '_blank')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
