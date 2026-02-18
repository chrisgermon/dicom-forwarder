import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Pin,
  Clock,
  Star,
  Building2,
  ChevronRight,
  ChevronDown,
  PinOff,
  Folder,
  Activity,
} from "lucide-react";
import { formatAUDateTimeFull } from "@/lib/dateUtils";
import { getFileTypeConfig } from "@/lib/fileTypeConfig";
import { FileActivityFeedCompact, FileActivity } from "./FileActivityFeed";

interface PinnedFolder {
  id: string;
  name: string;
  path: string;
  icon?: string;
}

interface RecentItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  lastAccessed: string;
}

interface FavoriteItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
}

interface DepartmentLink {
  id: string;
  name: string;
  path: string;
  color: string;
  icon?: string;
}

interface SharePointSidebarProps {
  pinnedFolders: PinnedFolder[];
  recentItems: RecentItem[];
  favoriteItems: FavoriteItem[];
  departmentLinks: DepartmentLink[];
  recentActivity?: FileActivity[];
  onNavigate: (path: string) => void;
  onPinFolder?: (folder: PinnedFolder) => void;
  onUnpinFolder?: (folderId: string) => void;
  onToggleFavorite?: (itemId: string) => void;
  className?: string;
}

export function SharePointSidebar({
  pinnedFolders,
  recentItems,
  favoriteItems,
  departmentLinks,
  recentActivity = [],
  onNavigate,
  onPinFolder: _onPinFolder,
  onUnpinFolder,
  onToggleFavorite,
  className,
}: SharePointSidebarProps) {
  const [expandedSections, setExpandedSections] = useState({
    pinned: true,
    recent: true,
    favorites: true,
    departments: true,
    activity: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getFileIcon = (fileName: string) => {
    const config = getFileTypeConfig(fileName);
    const Icon = config.icon;
    return <Icon className={`h-4 w-4 ${config.colorClass}`} />;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Pinned Folders */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pin className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Pinned</CardTitle>
              <Badge variant="secondary" className="h-5 text-xs">
                {pinnedFolders.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('pinned')}
              className="h-6 w-6 p-0"
            >
              {expandedSections.pinned ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.pinned && (
          <CardContent className="pt-0 space-y-1">
            {pinnedFolders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No pinned folders yet
              </p>
            ) : (
              pinnedFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="group flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                >
                  <Folder className="h-4 w-4 text-primary flex-shrink-0" />
                  <span
                    className="text-sm truncate flex-1"
                    onClick={() => onNavigate(folder.path)}
                    title={folder.name}
                  >
                    {folder.name}
                  </span>
                  {onUnpinFolder && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnpinFolder(folder.id);
                      }}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Unpin"
                    >
                      <PinOff className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        )}
      </Card>

      {/* Recent Items */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-info" />
              <CardTitle className="text-sm font-semibold">Recent</CardTitle>
              <Badge variant="secondary" className="h-5 text-xs">
                {recentItems.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('recent')}
              className="h-6 w-6 p-0"
            >
              {expandedSections.recent ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.recent && (
          <CardContent className="pt-0">
            <ScrollArea className="h-[200px]">
              <div className="space-y-1">
                {recentItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No recent items
                  </p>
                ) : (
                  recentItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                      onClick={() => onNavigate(item.path)}
                    >
                      {item.type === 'folder' ? (
                        <Folder className="h-4 w-4 text-primary flex-shrink-0" />
                      ) : (
                        getFileIcon(item.name)
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" title={item.name}>
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatAUDateTimeFull(item.lastAccessed)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        )}
      </Card>

      {/* Favorites */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-warning fill-warning" />
              <CardTitle className="text-sm font-semibold">Favorites</CardTitle>
              <Badge variant="secondary" className="h-5 text-xs">
                {favoriteItems.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('favorites')}
              className="h-6 w-6 p-0"
            >
              {expandedSections.favorites ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.favorites && (
          <CardContent className="pt-0">
            <ScrollArea className="h-[180px]">
              <div className="space-y-1">
                {favoriteItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No favorite items
                  </p>
                ) : (
                  favoriteItems.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                    >
                      {item.type === 'folder' ? (
                        <Folder className="h-4 w-4 text-primary flex-shrink-0" />
                      ) : (
                        getFileIcon(item.name)
                      )}
                      <span
                        className="text-sm truncate flex-1"
                        onClick={() => onNavigate(item.path)}
                        title={item.name}
                      >
                        {item.name}
                      </span>
                      {onToggleFavorite && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(item.id);
                          }}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove from favorites"
                        >
                          <Star className="h-3 w-3 fill-warning text-warning" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        )}
      </Card>

      {/* Department Links */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-success" />
              <CardTitle className="text-sm font-semibold">Departments</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('departments')}
              className="h-6 w-6 p-0"
            >
              {expandedSections.departments ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.departments && (
          <CardContent className="pt-0 space-y-1">
            {departmentLinks.map((dept) => (
              <Button
                key={dept.id}
                variant="ghost"
                size="sm"
                onClick={() => onNavigate(dept.path)}
                className="w-full justify-start gap-2 h-9"
              >
                <div className={`h-2 w-2 rounded-full ${dept.color}`} />
                <span className="text-sm">{dept.name}</span>
              </Button>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-info" />
                <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
                <Badge variant="secondary" className="h-5 text-xs">
                  {recentActivity.length}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection('activity')}
                className="h-6 w-6 p-0"
              >
                {expandedSections.activity ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {expandedSections.activity && (
            <CardContent className="pt-0">
              <FileActivityFeedCompact activities={recentActivity} maxItems={5} />
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
