import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Upload,
  Download,
  Edit,
  Trash2,
  Move,
  Copy,
  Share2,
  Eye,
  FolderPlus,
  Archive,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getFileTypeConfig } from "@/lib/fileTypeConfig";

export type ActivityType =
  | 'upload'
  | 'download'
  | 'view'
  | 'edit'
  | 'delete'
  | 'rename'
  | 'move'
  | 'copy'
  | 'share'
  | 'create_folder'
  | 'archive';

export interface FileActivity {
  id: string;
  type: ActivityType;
  fileName: string;
  fileType?: string;
  user: {
    name: string;
    email?: string;
    avatar?: string;
  };
  timestamp: string;
  details?: string;
  path?: string;
}

interface FileActivityFeedProps {
  activities: FileActivity[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
  maxHeight?: string;
  showHeader?: boolean;
}

const activityConfig: Record<ActivityType, {
  icon: typeof Upload;
  label: string;
  color: string;
}> = {
  upload: {
    icon: Upload,
    label: 'uploaded',
    color: 'text-success',
  },
  download: {
    icon: Download,
    label: 'downloaded',
    color: 'text-info',
  },
  view: {
    icon: Eye,
    label: 'viewed',
    color: 'text-muted-foreground',
  },
  edit: {
    icon: Edit,
    label: 'edited',
    color: 'text-warning',
  },
  delete: {
    icon: Trash2,
    label: 'deleted',
    color: 'text-destructive',
  },
  rename: {
    icon: Edit,
    label: 'renamed',
    color: 'text-primary',
  },
  move: {
    icon: Move,
    label: 'moved',
    color: 'text-purple-600',
  },
  copy: {
    icon: Copy,
    label: 'copied',
    color: 'text-blue-600',
  },
  share: {
    icon: Share2,
    label: 'shared',
    color: 'text-green-600',
  },
  create_folder: {
    icon: FolderPlus,
    label: 'created folder',
    color: 'text-primary',
  },
  archive: {
    icon: Archive,
    label: 'archived',
    color: 'text-orange-600',
  },
};

export function FileActivityFeed({
  activities,
  onRefresh,
  isRefreshing = false,
  maxHeight = "400px",
  showHeader = true,
}: FileActivityFeedProps) {
  const getFileIcon = (fileName?: string, _fileType?: string) => {
    if (!fileName) return <FileText className="h-4 w-4 text-muted-foreground" />;

    const config = getFileTypeConfig(fileName);
    const Icon = config.icon;
    return <Icon className={`h-4 w-4 ${config.colorClass}`} />;
  };

  const getActivityIcon = (type: ActivityType) => {
    const config = activityConfig[type];
    const Icon = config.icon;
    return <Icon className={`h-4 w-4 ${config.color}`} />;
  };

  const getRelativeTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  if (activities.length === 0) {
    return showHeader ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            📋 Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No recent activity
          </p>
        </CardContent>
      </Card>
    ) : (
      <div className="text-sm text-muted-foreground text-center py-4">
        No recent activity
      </div>
    );
  }

  const content = (
    <ScrollArea style={{ height: maxHeight }}>
      <div className="space-y-3 pr-4">
        {activities.map((activity) => {
          const config = activityConfig[activity.type];

          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 pb-3 border-b last:border-b-0"
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {getActivityIcon(activity.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm">
                    <span className="font-medium">{activity.user.name}</span>
                    {' '}
                    <span className="text-muted-foreground">{config.label}</span>
                    {' '}
                    <span className="font-medium inline-flex items-center gap-1">
                      {getFileIcon(activity.fileName, activity.fileType)}
                      <span className="truncate max-w-[200px]" title={activity.fileName}>
                        {activity.fileName}
                      </span>
                    </span>
                  </p>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {getRelativeTime(activity.timestamp)}
                  </span>
                </div>

                {activity.details && (
                  <p className="text-xs text-muted-foreground">
                    {activity.details}
                  </p>
                )}

                {activity.path && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {activity.path}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );

  if (!showHeader) {
    return content;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            📋 Recent Activity
            <Badge variant="secondary" className="h-5 text-xs">
              {activities.length}
            </Badge>
          </CardTitle>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-7 px-2"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {content}
      </CardContent>
    </Card>
  );
}

// Compact version for sidebar
export function FileActivityFeedCompact({
  activities,
  maxItems = 5,
}: {
  activities: FileActivity[];
  maxItems?: number;
}) {
  const recentActivities = activities.slice(0, maxItems);

  return (
    <div className="space-y-2">
      {recentActivities.map((activity) => {
        const config = activityConfig[activity.type];
        const Icon = config.icon;

        return (
          <div
            key={activity.id}
            className="flex items-center gap-2 text-xs group hover:bg-accent p-1 rounded transition-colors"
          >
            <Icon className={`h-3 w-3 flex-shrink-0 ${config.color}`} />
            <div className="flex-1 min-w-0">
              <p className="truncate">
                <span className="font-medium">{activity.user.name}</span>
                {' '}
                <span className="text-muted-foreground">{config.label}</span>
              </p>
              <p className="truncate text-muted-foreground">{activity.fileName}</p>
            </div>
            <span className="text-muted-foreground flex-shrink-0">
              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })
                .replace('about ', '')
                .replace(' ago', '')}
            </span>
          </div>
        );
      })}
    </div>
  );
}
