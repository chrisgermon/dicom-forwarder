import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  Folder,
  TrendingUp,
  Clock,
  Tag,
  ChevronRight,
  X,
} from "lucide-react";

interface FolderSuggestion {
  id: string;
  folderPath: string;
  folderName: string;
  reason: string;
  confidence: number; // 0-100
  type: 'frequent' | 'recent' | 'related' | 'recommended';
  metadata?: {
    accessCount?: number;
    lastAccessed?: string;
    relatedTags?: string[];
  };
}

interface SmartFolderSuggestionsProps {
  currentFile?: {
    id: string;
    name: string;
    tags?: string[];
  };
  suggestions: FolderSuggestion[];
  onNavigate: (path: string) => void;
  onDismiss?: (suggestionId: string) => void;
  maxSuggestions?: number;
}

/**
 * Smart Folder Suggestions Component
 * AI/Rule-based suggestions for where to file documents
 * Helps users find the right location quickly
 */
export function SmartFolderSuggestions({
  currentFile,
  suggestions,
  onNavigate,
  onDismiss,
  maxSuggestions = 5,
}: SmartFolderSuggestionsProps) {
  if (suggestions.length === 0) return null;

  const displaySuggestions = suggestions.slice(0, maxSuggestions);

  const getTypeIcon = (type: FolderSuggestion['type']) => {
    switch (type) {
      case 'frequent': return <TrendingUp className="h-3 w-3" />;
      case 'recent': return <Clock className="h-3 w-3" />;
      case 'related': return <Tag className="h-3 w-3" />;
      case 'recommended': return <Lightbulb className="h-3 w-3" />;
    }
  };

  const getTypeLabel = (type: FolderSuggestion['type']) => {
    switch (type) {
      case 'frequent': return 'Frequently Used';
      case 'recent': return 'Recently Accessed';
      case 'related': return 'Related Content';
      case 'recommended': return 'Recommended';
    }
  };

  const getTypeColor = (type: FolderSuggestion['type']) => {
    switch (type) {
      case 'frequent': return 'text-success';
      case 'recent': return 'text-info';
      case 'related': return 'text-primary';
      case 'recommended': return 'text-warning';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Suggested Folders
            {currentFile && (
              <span className="text-xs text-muted-foreground font-normal">
                for {currentFile.name}
              </span>
            )}
          </CardTitle>
          <Badge variant="secondary" className="h-5 text-xs">
            {suggestions.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {displaySuggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="group flex items-start gap-2 p-2 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 flex-shrink-0">
              <Folder className="h-4 w-4 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium truncate" title={suggestion.folderPath}>
                  {suggestion.folderName}
                </p>
                <Badge
                  variant="outline"
                  className={`h-5 text-xs gap-1 ${getTypeColor(suggestion.type)}`}
                >
                  {getTypeIcon(suggestion.type)}
                  {getTypeLabel(suggestion.type)}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground mb-1">{suggestion.reason}</p>

              {suggestion.metadata && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {suggestion.metadata.accessCount !== undefined && (
                    <span>{suggestion.metadata.accessCount} accesses</span>
                  )}
                  {suggestion.metadata.relatedTags && suggestion.metadata.relatedTags.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {suggestion.metadata.relatedTags.slice(0, 2).join(', ')}
                    </span>
                  )}
                  {suggestion.confidence >= 80 && (
                    <Badge variant="default" className="h-5 text-xs">
                      {suggestion.confidence}% match
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate(suggestion.folderPath)}
                className="h-7 px-2"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismiss(suggestion.id)}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {suggestions.length > maxSuggestions && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{suggestions.length - maxSuggestions} more suggestions
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Generate smart folder suggestions based on rules
 * In production, this would use ML or more sophisticated logic
 */
export function generateFolderSuggestions(
  currentFile: { name: string; tags?: string[]; path?: string },
  recentFolders: Array<{ path: string; name: string; accessCount: number }>,
  allFolders: Array<{ path: string; name: string; tags?: string[] }>
): FolderSuggestion[] {
  const suggestions: FolderSuggestion[] = [];

  // Rule 1: Suggest frequently accessed folders
  recentFolders
    .filter((folder) => folder.accessCount > 5)
    .slice(0, 2)
    .forEach((folder, idx) => {
      suggestions.push({
        id: `frequent_${idx}`,
        folderPath: folder.path,
        folderName: folder.name,
        reason: `You've accessed this folder ${folder.accessCount} times recently`,
        confidence: Math.min(95, 70 + folder.accessCount * 2),
        type: 'frequent',
        metadata: {
          accessCount: folder.accessCount,
        },
      });
    });

  // Rule 2: Suggest based on file tags
  if (currentFile.tags && currentFile.tags.length > 0) {
    allFolders
      .filter((folder) =>
        folder.tags?.some((tag) => currentFile.tags?.includes(tag))
      )
      .slice(0, 2)
      .forEach((folder, idx) => {
        const matchingTags = folder.tags?.filter((tag) => currentFile.tags?.includes(tag)) || [];
        suggestions.push({
          id: `related_${idx}`,
          folderPath: folder.path,
          folderName: folder.name,
          reason: `Contains files with similar tags`,
          confidence: (matchingTags.length / currentFile.tags!.length) * 100,
          type: 'related',
          metadata: {
            relatedTags: matchingTags,
          },
        });
      });
  }

  // Rule 3: Suggest based on file name patterns
  const fileName = currentFile.name.toLowerCase();
  if (fileName.includes('protocol')) {
    suggestions.push({
      id: 'name_protocol',
      folderPath: '/Radiology/Protocols',
      folderName: 'Protocols',
      reason: 'File name suggests this is a protocol document',
      confidence: 85,
      type: 'recommended',
    });
  }
  if (fileName.includes('policy')) {
    suggestions.push({
      id: 'name_policy',
      folderPath: '/Admin/Policies',
      folderName: 'Policies',
      reason: 'File name suggests this is a policy document',
      confidence: 85,
      type: 'recommended',
    });
  }
  if (fileName.includes('training') || fileName.includes('manual')) {
    suggestions.push({
      id: 'name_training',
      folderPath: '/HR/Training',
      folderName: 'Training',
      reason: 'File name suggests this is training material',
      confidence: 80,
      type: 'recommended',
    });
  }
  if (fileName.includes('form')) {
    suggestions.push({
      id: 'name_form',
      folderPath: '/Clinical/Forms',
      folderName: 'Forms',
      reason: 'File name suggests this is a form',
      confidence: 80,
      type: 'recommended',
    });
  }

  // Rule 4: Suggest recently accessed folders
  recentFolders
    .slice(0, 2)
    .forEach((folder, idx) => {
      if (!suggestions.some((s) => s.folderPath === folder.path)) {
        suggestions.push({
          id: `recent_${idx}`,
          folderPath: folder.path,
          folderName: folder.name,
          reason: 'Recently accessed folder',
          confidence: 70,
          type: 'recent',
        });
      }
    });

  // Sort by confidence and remove duplicates
  return Array.from(
    new Map(suggestions.map((s) => [s.folderPath, s])).values()
  )
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
}
