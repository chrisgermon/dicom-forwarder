import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  History,
  Download,
  Eye,
  RotateCcw,
  FileText,
  User,
  Calendar,
  FileCheck,
  AlertCircle,
} from "lucide-react";
import { formatAUDateTimeFull } from "@/lib/dateUtils";
import { formatFileSize } from "@/lib/fileTypeConfig";
import { toast } from "sonner";

export interface FileVersion {
  id: string;
  versionNumber: string;
  modifiedDateTime: string;
  modifiedBy: {
    name: string;
    email?: string;
  };
  size: number;
  comment?: string;
  downloadUrl?: string;
  isCurrentVersion: boolean;
}

interface VersionHistoryProps {
  fileName: string;
  versions: FileVersion[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestoreVersion?: (versionId: string) => Promise<void>;
  onDownloadVersion?: (versionId: string) => void;
  onPreviewVersion?: (versionId: string) => void;
}

/**
 * Version History Component
 * Displays version history for SharePoint files
 * Allows users to view, download, and restore previous versions
 */
export function VersionHistory({
  fileName,
  versions,
  open,
  onOpenChange,
  onRestoreVersion,
  onDownloadVersion,
  onPreviewVersion,
}: VersionHistoryProps) {
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleRestore = async (versionId: string) => {
    if (!onRestoreVersion) return;

    setRestoringId(versionId);
    try {
      await onRestoreVersion(versionId);
      toast.success('Version restored successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error restoring version:', error);
      toast.error('Failed to restore version');
    } finally {
      setRestoringId(null);
    }
  };

  const currentVersion = versions.find((v) => v.isCurrentVersion);
  const previousVersions = versions.filter((v) => !v.isCurrentVersion);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Version History
          </DialogTitle>
          <DialogDescription>
            View and manage different versions of <span className="font-medium">{fileName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Version */}
          {currentVersion && (
            <div className="border border-primary/30 rounded-lg p-4 bg-primary/5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold">
                        Version {currentVersion.versionNumber}
                      </p>
                      <Badge variant="default" className="h-5">
                        Current
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {currentVersion.modifiedBy.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatAUDateTimeFull(currentVersion.modifiedDateTime)}
                      </span>
                      <span>{formatFileSize(currentVersion.size)}</span>
                    </div>
                    {currentVersion.comment && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        "{currentVersion.comment}"
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {onPreviewVersion && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onPreviewVersion(currentVersion.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {onDownloadVersion && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDownloadVersion(currentVersion.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Previous Versions */}
          {previousVersions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-medium">Previous Versions</h3>
                <Badge variant="secondary">{previousVersions.length}</Badge>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-2 pr-4">
                  {previousVersions.map((version) => (
                    <div
                      key={version.id}
                      className="border border-border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-1.5 rounded-lg bg-muted">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium mb-1">
                              Version {version.versionNumber}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {version.modifiedBy.name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatAUDateTimeFull(version.modifiedDateTime)}
                              </span>
                              <span>{formatFileSize(version.size)}</span>
                            </div>
                            {version.comment && (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                "{version.comment}"
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {onPreviewVersion && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onPreviewVersion(version.id)}
                              title="Preview this version"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {onDownloadVersion && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDownloadVersion(version.id)}
                              title="Download this version"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          {onRestoreVersion && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestore(version.id)}
                              disabled={restoringId === version.id}
                              title="Restore this version"
                            >
                              <RotateCcw
                                className={`h-4 w-4 ${
                                  restoringId === version.id ? 'animate-spin' : ''
                                }`}
                              />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {versions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">No version history available</p>
              <p className="text-xs text-muted-foreground">
                This file doesn't have any previous versions
              </p>
            </div>
          )}

          {/* Version History Info */}
          <div className="bg-muted/50 p-3 rounded-lg border border-border">
            <p className="text-xs font-medium mb-2">About Version History</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• SharePoint automatically saves versions when files are modified</li>
              <li>• You can restore any previous version to make it the current version</li>
              <li>• Version history is retained according to your organization's policy</li>
              <li>• Major versions are created manually, minor versions automatically</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Version History Button
 * Trigger button for the version history dialog
 */
interface VersionHistoryButtonProps {
  fileName: string;
  onShowHistory: () => void;
  versionCount?: number;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function VersionHistoryButton({
  onShowHistory,
  versionCount,
  variant = "ghost",
  size = "sm",
}: VersionHistoryButtonProps) {
  return (
    <Button variant={variant} size={size} onClick={onShowHistory}>
      <History className="h-4 w-4 mr-2" />
      Version History
      {versionCount !== undefined && versionCount > 1 && (
        <Badge variant="secondary" className="ml-2 h-5">
          {versionCount}
        </Badge>
      )}
    </Button>
  );
}

/**
 * Mock data generator for testing
 */
export function generateMockVersionHistory(_fileName: string): FileVersion[] {
  const baseDate = new Date();

  return [
    {
      id: 'v4',
      versionNumber: '4.0',
      modifiedDateTime: baseDate.toISOString(),
      modifiedBy: {
        name: 'Dr. Sarah Chen',
        email: 'sarah.chen@visionradiology.com.au',
      },
      size: 2547123,
      comment: 'Updated imaging protocols for 2026',
      isCurrentVersion: true,
    },
    {
      id: 'v3',
      versionNumber: '3.0',
      modifiedDateTime: new Date(baseDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      modifiedBy: {
        name: 'John Smith',
        email: 'john.smith@visionradiology.com.au',
      },
      size: 2512000,
      comment: 'Minor corrections to CT protocols',
      isCurrentVersion: false,
    },
    {
      id: 'v2',
      versionNumber: '2.0',
      modifiedDateTime: new Date(baseDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      modifiedBy: {
        name: 'Maria Garcia',
        email: 'maria.garcia@visionradiology.com.au',
      },
      size: 2489000,
      comment: 'Added new MRI safety guidelines',
      isCurrentVersion: false,
    },
    {
      id: 'v1',
      versionNumber: '1.0',
      modifiedDateTime: new Date(baseDate.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      modifiedBy: {
        name: 'David Lee',
        email: 'david.lee@visionradiology.com.au',
      },
      size: 2401000,
      comment: 'Initial version',
      isCurrentVersion: false,
    },
  ];
}
