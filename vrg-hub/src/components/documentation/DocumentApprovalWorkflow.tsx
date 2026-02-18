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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// Select components removed - not currently used
import {
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  UserCheck,
  FileCheck,
  AlertCircle,
  MessageSquare,
  User,
  Calendar,
} from "lucide-react";
import { formatAUDateTimeFull } from "@/lib/dateUtils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'revision_requested';

export interface ApprovalStep {
  id: string;
  approver: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  approvedAt?: string;
  comments?: string;
  order: number;
}

export interface DocumentApproval {
  id: string;
  fileId: string;
  fileName: string;
  status: ApprovalStatus;
  submittedBy: {
    id: string;
    name: string;
    email: string;
  };
  submittedAt: string;
  completedAt?: string;
  steps: ApprovalStep[];
  currentStep: number;
  comments?: string;
  version?: string;
}

interface DocumentApprovalWorkflowProps {
  fileId: string;
  fileName: string;
  currentApproval?: DocumentApproval;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitForApproval?: (approvers: string[], comments: string) => Promise<void>;
  onApprove?: (stepId: string, comments: string) => Promise<void>;
  onReject?: (stepId: string, comments: string) => Promise<void>;
  onRequestRevision?: (stepId: string, comments: string) => Promise<void>;
}

// Predefined approvers for Vision Radiology Group
const APPROVERS = [
  { id: 'radiologist-lead', name: 'Dr. Sarah Chen', email: 'sarah.chen@visionradiology.com.au', role: 'Lead Radiologist' },
  { id: 'clinical-director', name: 'Dr. Michael Wong', email: 'michael.wong@visionradiology.com.au', role: 'Clinical Director' },
  { id: 'compliance-officer', name: 'Lisa Anderson', email: 'lisa.anderson@visionradiology.com.au', role: 'Compliance Officer' },
  { id: 'it-manager', name: 'David Lee', email: 'david.lee@visionradiology.com.au', role: 'IT Manager' },
  { id: 'hr-director', name: 'Maria Garcia', email: 'maria.garcia@visionradiology.com.au', role: 'HR Director' },
  { id: 'admin-manager', name: 'John Smith', email: 'john.smith@visionradiology.com.au', role: 'Admin Manager' },
];

/**
 * Document Approval Workflow Component
 * Multi-step approval process for policies, protocols, and procedures
 * Integrates with existing document management system
 */
export function DocumentApprovalWorkflow({
  fileId: _fileId,
  fileName,
  currentApproval,
  open,
  onOpenChange,
  onSubmitForApproval,
  onApprove,
  onReject,
  onRequestRevision,
}: DocumentApprovalWorkflowProps) {
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const [comments, setComments] = useState('');
  const [actionComments, setActionComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitForApproval = async () => {
    if (selectedApprovers.length === 0) {
      toast.error('Please select at least one approver');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitForApproval?.(selectedApprovers, comments);
      toast.success('Document submitted for approval');
      onOpenChange(false);
      setSelectedApprovers([]);
      setComments('');
    } catch (error) {
      console.error('Error submitting for approval:', error);
      toast.error('Failed to submit for approval');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (stepId: string) => {
    setSubmitting(true);
    try {
      await onApprove?.(stepId, actionComments);
      toast.success('Document approved');
      setActionComments('');
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Failed to approve document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (stepId: string) => {
    if (!actionComments.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setSubmitting(true);
    try {
      await onReject?.(stepId, actionComments);
      toast.success('Document rejected');
      setActionComments('');
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Failed to reject document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestRevision = async (stepId: string) => {
    if (!actionComments.trim()) {
      toast.error('Please describe the revisions needed');
      return;
    }

    setSubmitting(true);
    try {
      await onRequestRevision?.(stepId, actionComments);
      toast.success('Revision requested');
      setActionComments('');
    } catch (error) {
      console.error('Error requesting revision:', error);
      toast.error('Failed to request revision');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: ApprovalStatus) => {
    switch (status) {
      case 'draft': return 'text-muted-foreground';
      case 'pending': return 'text-warning';
      case 'approved': return 'text-success';
      case 'rejected': return 'text-destructive';
      case 'revision_requested': return 'text-info';
    }
  };

  const getStatusIcon = (status: ApprovalStatus) => {
    switch (status) {
      case 'draft': return <FileCheck className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4 animate-pulse" />;
      case 'approved': return <CheckCircle2 className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'revision_requested': return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: ApprovalStatus) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'pending': return 'Pending Approval';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'revision_requested': return 'Revision Requested';
    }
  };

  const currentStep = currentApproval?.steps[currentApproval.currentStep];
  const isCurrentUserApprover = currentStep?.approver.id === 'current-user'; // TODO: Check against actual user

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Document Approval Workflow
          </DialogTitle>
          <DialogDescription>
            Manage approval process for <span className="font-medium">{fileName}</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* No Approval - Submit for Approval */}
            {!currentApproval && (
              <div className="space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">Submit for Approval</p>
                  <p className="text-xs text-muted-foreground">
                    This document has not been submitted for approval yet. Select approvers and
                    submit when ready.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Select Approvers</Label>
                  <div className="grid gap-2">
                    {APPROVERS.map((approver) => (
                      <div
                        key={approver.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedApprovers.includes(approver.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-accent/50"
                        )}
                        onClick={() => {
                          setSelectedApprovers((prev) =>
                            prev.includes(approver.id)
                              ? prev.filter((id) => id !== approver.id)
                              : [...prev, approver.id]
                          );
                        }}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {approver.name.split(' ').map((n) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{approver.name}</p>
                          <p className="text-xs text-muted-foreground">{approver.role}</p>
                          <p className="text-xs text-muted-foreground">{approver.email}</p>
                        </div>
                        {selectedApprovers.includes(approver.id) && (
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedApprovers.length > 0 && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs font-medium mb-1">Approval Order:</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedApprovers.map((id, idx) => {
                          const approver = APPROVERS.find((a) => a.id === id);
                          return (
                            <span key={id}>
                              {idx + 1}. {approver?.name}
                              {idx < selectedApprovers.length - 1 ? ' → ' : ''}
                            </span>
                          );
                        })}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comments">Comments (Optional)</Label>
                  <Textarea
                    id="comments"
                    placeholder="Add any context or notes for approvers..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Active Approval Process */}
            {currentApproval && (
              <div className="space-y-4">
                {/* Status Header */}
                <div className="flex items-start justify-between gap-4 p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg bg-background", getStatusColor(currentApproval.status))}>
                      {getStatusIcon(currentApproval.status)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">
                          {getStatusLabel(currentApproval.status)}
                        </p>
                        <Badge variant="outline" className="h-5 text-xs">
                          Step {currentApproval.currentStep + 1} of {currentApproval.steps.length}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Submitted by {currentApproval.submittedBy.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatAUDateTimeFull(currentApproval.submittedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {currentApproval.version && (
                    <Badge variant="secondary">v{currentApproval.version}</Badge>
                  )}
                </div>

                {/* Submission Comments */}
                {currentApproval.comments && (
                  <div className="bg-muted/30 p-3 rounded-lg border">
                    <p className="text-xs font-medium mb-1 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Submission Comments
                    </p>
                    <p className="text-xs text-muted-foreground italic">"{currentApproval.comments}"</p>
                  </div>
                )}

                {/* Approval Steps */}
                <div className="space-y-3">
                  <Label>Approval Steps</Label>
                  {currentApproval.steps.map((step, index) => {
                    const isActive = index === currentApproval.currentStep;
                    const isPast = index < currentApproval.currentStep;

                    return (
                      <div
                        key={step.id}
                        className={cn(
                          "p-4 rounded-lg border",
                          isActive && "border-primary bg-primary/5",
                          isPast && step.status === 'approved' && "bg-success/5 border-success/20",
                          isPast && step.status === 'rejected' && "bg-destructive/5 border-destructive/20"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center gap-1">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                              isActive && "bg-primary text-primary-foreground",
                              isPast && step.status === 'approved' && "bg-success text-success-foreground",
                              isPast && step.status === 'rejected' && "bg-destructive text-destructive-foreground",
                              !isActive && !isPast && "bg-muted text-muted-foreground"
                            )}>
                              {index + 1}
                            </div>
                            {index < currentApproval.steps.length - 1 && (
                              <div className={cn(
                                "w-0.5 h-12",
                                isPast ? "bg-success/30" : "bg-muted"
                              )} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <p className="text-sm font-medium">{step.approver.name}</p>
                                <p className="text-xs text-muted-foreground">{step.approver.role}</p>
                              </div>
                              {step.status !== 'pending' && (
                                <Badge
                                  variant={step.status === 'approved' ? 'default' : 'destructive'}
                                  className="h-6"
                                >
                                  {step.status === 'approved' ? 'Approved' : 'Rejected'}
                                </Badge>
                              )}
                            </div>

                            {step.comments && (
                              <div className="bg-background p-2 rounded border mb-2">
                                <p className="text-xs text-muted-foreground italic">
                                  "{step.comments}"
                                </p>
                              </div>
                            )}

                            {step.approvedAt && (
                              <p className="text-xs text-muted-foreground">
                                {step.status === 'approved' ? 'Approved' : 'Rejected'} on{' '}
                                {formatAUDateTimeFull(step.approvedAt)}
                              </p>
                            )}

                            {/* Action Buttons for Current Approver */}
                            {isActive && isCurrentUserApprover && step.status === 'pending' && (
                              <div className="mt-3 space-y-2">
                                <Textarea
                                  placeholder="Add comments (required for rejection/revision)..."
                                  value={actionComments}
                                  onChange={(e) => setActionComments(e.target.value)}
                                  rows={2}
                                  className="text-xs"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprove(step.id)}
                                    disabled={submitting}
                                    className="flex-1"
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRequestRevision(step.id)}
                                    disabled={submitting}
                                  >
                                    <AlertCircle className="h-4 w-4 mr-1" />
                                    Request Revision
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleReject(step.id)}
                                    disabled={submitting}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!currentApproval && (
            <Button
              onClick={handleSubmitForApproval}
              disabled={selectedApprovers.length === 0 || submitting}
            >
              <Send className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Approval Status Badge
 * Compact badge showing current approval status
 */
export function ApprovalStatusBadge({ approval }: { approval?: DocumentApproval }) {
  if (!approval) return null;

  const getVariant = (status: ApprovalStatus) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'pending': return 'outline';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'revision_requested': return 'outline';
    }
  };

  return (
    <Badge variant={getVariant(approval.status)} className="gap-1">
      {approval.status === 'pending' && <Clock className="h-3 w-3" />}
      {approval.status === 'approved' && <CheckCircle2 className="h-3 w-3" />}
      {approval.status === 'rejected' && <XCircle className="h-3 w-3" />}
      {approval.status === 'revision_requested' && <AlertCircle className="h-3 w-3" />}
      {approval.status === 'pending'
        ? `Pending (${approval.currentStep + 1}/${approval.steps.length})`
        : approval.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
    </Badge>
  );
}
