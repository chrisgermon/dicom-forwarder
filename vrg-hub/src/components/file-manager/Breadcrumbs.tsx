import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Breadcrumb {
  id: string | null;
  name: string;
}

interface BreadcrumbsProps {
  items: Breadcrumb[];
  onNavigate: (folderId: string | null) => void;
}

export function Breadcrumbs({ items, onNavigate }: BreadcrumbsProps) {
  return (
    <div className="flex items-center gap-1 text-sm">
      {items.map((item, index) => (
        <div key={item.id || 'root'} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="size-4 text-muted-foreground" />}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(item.id)}
            className="h-8 px-2"
          >
            {index === 0 && <Home className="size-4 mr-1" />}
            {item.name}
          </Button>
        </div>
      ))}
    </div>
  );
}
