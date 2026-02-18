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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  GraduationCap,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  Award,
} from "lucide-react";
import { formatAUDateTimeFull } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

export interface TrainingMaterial {
  id: string;
  fileId: string;
  fileName: string;
  title: string;
  description?: string;
  department: string;
  category: 'mandatory' | 'recommended' | 'optional';
  estimatedDuration: number; // minutes
  expiryMonths?: number; // Re-certification period
  prerequisites?: string[];
  tags?: string[];
}

export interface TrainingCompletion {
  id: string;
  userId: string;
  materialId: string;
  completedAt: string;
  score?: number;
  expiresAt?: string;
  certificateUrl?: string;
  attestedBy?: {
    id: string;
    name: string;
    role: string;
  };
}

export interface TrainingProgress {
  material: TrainingMaterial;
  completion?: TrainingCompletion;
  status: 'not_started' | 'in_progress' | 'completed' | 'expired';
  daysUntilExpiry?: number;
}

interface TrainingMaterialTrackingProps {
  fileId: string;
  fileName: string;
  trainingMaterial?: TrainingMaterial;
  userProgress?: TrainingProgress[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkComplete?: (materialId: string, score?: number) => Promise<void>;
  onDownloadCertificate?: (completionId: string) => void;
}

// Sample departments and categories
// Departments available for training materials
const CATEGORIES = [
  { value: 'mandatory', label: 'Mandatory', color: 'text-destructive' },
  { value: 'recommended', label: 'Recommended', color: 'text-warning' },
  { value: 'optional', label: 'Optional', color: 'text-info' },
] as const;

/**
 * Training Material Tracking Component
 * Track completion of training materials for compliance and HR
 * Integrates with HR system for staff development tracking
 */
export function TrainingMaterialTracking({
  fileName,
  trainingMaterial,
  userProgress = [],
  open,
  onOpenChange,
  onMarkComplete,
  onDownloadCertificate,
}: TrainingMaterialTrackingProps) {
  const [marking, setMarking] = useState(false);

  const handleMarkComplete = async () => {
    if (!trainingMaterial) return;

    setMarking(true);
    try {
      await onMarkComplete?.(trainingMaterial.id);
    } catch (error) {
      console.error('Error marking complete:', error);
    } finally {
      setMarking(false);
    }
  };

  const getStatusColor = (status: TrainingProgress['status']) => {
    switch (status) {
      case 'not_started': return 'text-muted-foreground';
      case 'in_progress': return 'text-info';
      case 'completed': return 'text-success';
      case 'expired': return 'text-destructive';
    }
  };

  const getStatusIcon = (status: TrainingProgress['status']) => {
    switch (status) {
      case 'not_started': return <FileText className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4 animate-pulse" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'expired': return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getCategoryBadge = (category: TrainingMaterial['category']) => {
    const config = CATEGORIES.find((c) => c.value === category);
    return (
      <Badge
        variant={category === 'mandatory' ? 'destructive' : 'outline'}
        className={cn("gap-1", config?.color)}
      >
        {config?.label}
      </Badge>
    );
  };

  const completedCount = userProgress.filter((p) => p.status === 'completed').length;
  const expiringCount = userProgress.filter(
    (p) => p.status === 'completed' && p.daysUntilExpiry && p.daysUntilExpiry <= 30
  ).length;
  const expiredCount = userProgress.filter((p) => p.status === 'expired').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Training Material Tracking
          </DialogTitle>
          <DialogDescription>
            Track completion status for <span className="font-medium">{fileName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Training Material Details */}
          {trainingMaterial && (
            <div className="bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{trainingMaterial.title}</h3>
                    {getCategoryBadge(trainingMaterial.category)}
                  </div>
                  {trainingMaterial.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {trainingMaterial.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {trainingMaterial.estimatedDuration} min
                    </span>
                    <span>Department: {trainingMaterial.department}</span>
                    {trainingMaterial.expiryMonths && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Re-certify every {trainingMaterial.expiryMonths} months
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {trainingMaterial.prerequisites && trainingMaterial.prerequisites.length > 0 && (
                <div className="bg-background p-3 rounded border">
                  <p className="text-xs font-medium mb-1">Prerequisites:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {trainingMaterial.prerequisites.map((prereq, idx) => (
                      <li key={idx}>• {prereq}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Overall Statistics */}
          {userProgress.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-muted/30 p-3 rounded-lg border text-center">
                <p className="text-2xl font-bold">{userProgress.length}</p>
                <p className="text-xs text-muted-foreground">Total Staff</p>
              </div>
              <div className="bg-success/10 border-success/20 p-3 rounded-lg border text-center">
                <p className="text-2xl font-bold text-success">{completedCount}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              {expiringCount > 0 && (
                <div className="bg-warning/10 border-warning/20 p-3 rounded-lg border text-center">
                  <p className="text-2xl font-bold text-warning">{expiringCount}</p>
                  <p className="text-xs text-muted-foreground">Expiring Soon</p>
                </div>
              )}
              {expiredCount > 0 && (
                <div className="bg-destructive/10 border-destructive/20 p-3 rounded-lg border text-center">
                  <p className="text-2xl font-bold text-destructive">{expiredCount}</p>
                  <p className="text-xs text-muted-foreground">Expired</p>
                </div>
              )}
            </div>
          )}

          {/* Completion Progress Bar */}
          {userProgress.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Overall Completion</span>
                <span className="font-medium">
                  {Math.round((completedCount / userProgress.length) * 100)}%
                </span>
              </div>
              <Progress
                value={(completedCount / userProgress.length) * 100}
                className="h-2"
              />
            </div>
          )}

          {/* User Progress List */}
          {userProgress.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Staff Completion Status</h4>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2 pr-4">
                  {userProgress.map((progress) => (
                    <div
                      key={progress.material.id}
                      className={cn(
                        "p-3 rounded-lg border",
                        progress.status === 'completed' && "bg-success/5 border-success/20",
                        progress.status === 'expired' && "bg-destructive/5 border-destructive/20"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {progress.completion?.userId.substring(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <p className="text-sm font-medium">
                                User {progress.completion?.userId || 'Unknown'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={cn(
                                  "text-xs flex items-center gap-1",
                                  getStatusColor(progress.status)
                                )}>
                                  {getStatusIcon(progress.status)}
                                  {progress.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                                {progress.completion?.score !== undefined && (
                                  <Badge variant="outline" className="h-5 text-xs">
                                    Score: {progress.completion.score}%
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {progress.completion?.certificateUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDownloadCertificate?.(progress.completion!.id)}
                              >
                                <Award className="h-4 w-4 mr-1" />
                                Certificate
                              </Button>
                            )}
                          </div>

                          {progress.completion && (
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Completed {formatAUDateTimeFull(progress.completion.completedAt)}
                              </span>
                              {progress.daysUntilExpiry !== undefined && (
                                <span className={cn(
                                  progress.daysUntilExpiry <= 30 && "text-warning font-medium"
                                )}>
                                  {progress.status === 'expired'
                                    ? 'Expired'
                                    : `Expires in ${progress.daysUntilExpiry}d`
                                  }
                                </span>
                              )}
                            </div>
                          )}

                          {progress.completion?.attestedBy && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Attested by {progress.completion.attestedBy.name} ({progress.completion.attestedBy.role})
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* No Progress Data */}
          {userProgress.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-lg">
              <GraduationCap className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">No Training Data</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                This file has not been configured as a training material yet, or no staff have been
                assigned to complete it.
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-muted/50 p-3 rounded-lg border border-border">
            <p className="text-xs font-medium mb-2">About Training Tracking</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Mandatory training must be completed by all relevant staff</li>
              <li>• Certificates are automatically generated upon completion</li>
              <li>• Expiring certifications trigger automatic email reminders</li>
              <li>• Training records are stored for compliance audits</li>
              <li>• Integration with HR system for staff development tracking</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {trainingMaterial && !marking && (
            <Button onClick={handleMarkComplete} disabled={marking}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark as Complete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Training Badge
 * Shows training status for a file
 */
export function TrainingBadge({ material }: { material?: TrainingMaterial }) {
  if (!material) return null;

  return (
    <Badge
      variant={material.category === 'mandatory' ? 'destructive' : 'outline'}
      className="gap-1"
    >
      <GraduationCap className="h-3 w-3" />
      Training: {material.category === 'mandatory' ? 'Required' : 'Optional'}
    </Badge>
  );
}

/**
 * Generate mock training progress data for testing
 */
export function generateMockTrainingProgress(material: TrainingMaterial): TrainingProgress[] {
  const users = ['U001', 'U002', 'U003', 'U004', 'U005', 'U006', 'U007', 'U008', 'U009', 'U010'];

  return users.map((userId, idx) => {
    const isCompleted = idx < 7; // 70% completion rate
    const isExpired = isCompleted && idx < 2; // 2 expired
    const completedAt = new Date();
    completedAt.setDate(completedAt.getDate() - (idx * 10));

    let expiresAt: Date | undefined;
    let daysUntilExpiry: number | undefined;

    if (isCompleted && material.expiryMonths) {
      expiresAt = new Date(completedAt);
      expiresAt.setMonth(expiresAt.getMonth() + material.expiryMonths);
      daysUntilExpiry = Math.floor((expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      material,
      completion: isCompleted ? {
        id: `completion_${userId}`,
        userId,
        materialId: material.id,
        completedAt: completedAt.toISOString(),
        score: 75 + Math.floor(Math.random() * 25),
        expiresAt: expiresAt?.toISOString(),
        certificateUrl: `/certificates/${userId}_${material.id}.pdf`,
        attestedBy: {
          id: 'supervisor_1',
          name: 'Dr. Sarah Chen',
          role: 'Clinical Supervisor',
        },
      } : undefined,
      status: isExpired ? 'expired' : (isCompleted ? 'completed' : (idx < 9 ? 'not_started' : 'in_progress')),
      daysUntilExpiry,
    };
  });
}
