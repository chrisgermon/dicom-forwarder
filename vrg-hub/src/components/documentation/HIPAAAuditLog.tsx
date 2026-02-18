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
// Input available if needed
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Shield,
  Download,
  Filter,
  Calendar as CalendarIcon,
  // User icon available if needed
  FileText,
  Eye,
  Edit,
  Trash2,
  Share2,
  Lock,
  Unlock,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { formatAUDateTimeFull } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type AuditAction =
  | 'view'
  | 'download'
  | 'edit'
  | 'delete'
  | 'share'
  | 'permission_change'
  | 'access_denied'
  | 'export'
  | 'print';

export type AuditRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  action: AuditAction;
  resourceId: string;
  resourceName: string;
  resourceType: 'file' | 'folder';
  ipAddress: string;
  userAgent: string;
  success: boolean;
  riskLevel: AuditRiskLevel;
  metadata?: {
    oldValue?: string;
    newValue?: string;
    reason?: string;
    sharedWith?: string[];
  };
  phi_involved?: boolean; // Protected Health Information flag
}

interface HIPAAAuditLogProps {
  fileId?: string;
  fileName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries?: AuditLogEntry[];
  onExportAuditLog?: (filters: AuditFilters) => Promise<void>;
}

interface AuditFilters {
  dateFrom?: Date;
  dateTo?: Date;
  userId?: string;
  action?: AuditAction;
  riskLevel?: AuditRiskLevel;
  successOnly?: boolean;
  phiOnly?: boolean;
}

/**
 * HIPAA Audit Log Component
 * Comprehensive audit trail for compliance with HIPAA requirements
 * Tracks all file access and modifications for Protected Health Information
 */
export function HIPAAAuditLog({
  fileId: _fileId,
  fileName,
  open,
  onOpenChange,
  entries = [],
  onExportAuditLog,
}: HIPAAAuditLogProps) {
  const [filters, setFilters] = useState<AuditFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await onExportAuditLog?.(filters);
      toast.success('Audit log exported successfully');
    } catch (error) {
      console.error('Error exporting audit log:', error);
      toast.error('Failed to export audit log');
    } finally {
      setExporting(false);
    }
  };

  const getActionIcon = (action: AuditAction) => {
    switch (action) {
      case 'view': return <Eye className="h-4 w-4" />;
      case 'download': return <Download className="h-4 w-4" />;
      case 'edit': return <Edit className="h-4 w-4" />;
      case 'delete': return <Trash2 className="h-4 w-4" />;
      case 'share': return <Share2 className="h-4 w-4" />;
      case 'permission_change': return <Lock className="h-4 w-4" />;
      case 'access_denied': return <Unlock className="h-4 w-4" />;
      case 'export': return <Download className="h-4 w-4" />;
      case 'print': return <FileText className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: AuditAction) => {
    switch (action) {
      case 'view': return 'text-info';
      case 'download': return 'text-primary';
      case 'edit': return 'text-warning';
      case 'delete': return 'text-destructive';
      case 'share': return 'text-success';
      case 'permission_change': return 'text-warning';
      case 'access_denied': return 'text-destructive';
      case 'export': return 'text-primary';
      case 'print': return 'text-info';
    }
  };

  const getRiskBadge = (riskLevel: AuditRiskLevel) => {
    const config = {
      low: { variant: 'secondary' as const, label: 'Low Risk' },
      medium: { variant: 'outline' as const, label: 'Medium Risk' },
      high: { variant: 'default' as const, label: 'High Risk' },
      critical: { variant: 'destructive' as const, label: 'Critical' },
    };

    const { variant, label } = config[riskLevel];
    return <Badge variant={variant} className="text-xs">{label}</Badge>;
  };

  const filteredEntries = entries.filter((entry) => {
    if (filters.dateFrom && new Date(entry.timestamp) < filters.dateFrom) return false;
    if (filters.dateTo && new Date(entry.timestamp) > filters.dateTo) return false;
    if (filters.userId && entry.userId !== filters.userId) return false;
    if (filters.action && entry.action !== filters.action) return false;
    if (filters.riskLevel && entry.riskLevel !== filters.riskLevel) return false;
    if (filters.successOnly && !entry.success) return false;
    if (filters.phiOnly && !entry.phi_involved) return false;
    return true;
  });

  const highRiskCount = filteredEntries.filter(e => ['high', 'critical'].includes(e.riskLevel)).length;
  const failedAccessCount = filteredEntries.filter(e => !e.success).length;
  const phiAccessCount = filteredEntries.filter(e => e.phi_involved).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            HIPAA Audit Log
          </DialogTitle>
          <DialogDescription>
            {fileName
              ? `Audit trail for ${fileName}`
              : 'Complete audit trail for all file access and modifications'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Statistics */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-muted/30 p-3 rounded-lg border text-center">
              <p className="text-2xl font-bold">{filteredEntries.length}</p>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </div>
            <div className="bg-warning/10 border-warning/20 p-3 rounded-lg border text-center">
              <p className="text-2xl font-bold text-warning">{highRiskCount}</p>
              <p className="text-xs text-muted-foreground">High Risk</p>
            </div>
            <div className="bg-destructive/10 border-destructive/20 p-3 rounded-lg border text-center">
              <p className="text-2xl font-bold text-destructive">{failedAccessCount}</p>
              <p className="text-xs text-muted-foreground">Failed Access</p>
            </div>
            <div className="bg-primary/10 border-primary/20 p-3 rounded-lg border text-center">
              <p className="text-2xl font-bold text-primary">{phiAccessCount}</p>
              <p className="text-xs text-muted-foreground">PHI Involved</p>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting || filteredEntries.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Log
            </Button>
            <div className="ml-auto text-xs text-muted-foreground">
              Showing {filteredEntries.length} of {entries.length} events
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg border">
              {/* Date From */}
              <div className="space-y-2">
                <Label>From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? format(filters.dateFrom, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => setFilters(f => ({ ...f, dateFrom: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label>To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo ? format(filters.dateTo, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => setFilters(f => ({ ...f, dateTo: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Action */}
              <div className="space-y-2">
                <Label>Action Type</Label>
                <Select value={filters.action || 'all'} onValueChange={(v) => setFilters(f => ({ ...f, action: v === 'all' ? undefined : v as AuditAction }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="view">View</SelectItem>
                    <SelectItem value="download">Download</SelectItem>
                    <SelectItem value="edit">Edit</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="share">Share</SelectItem>
                    <SelectItem value="permission_change">Permission Change</SelectItem>
                    <SelectItem value="access_denied">Access Denied</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Risk Level */}
              <div className="space-y-2">
                <Label>Risk Level</Label>
                <Select value={filters.riskLevel || 'all'} onValueChange={(v) => setFilters(f => ({ ...f, riskLevel: v === 'all' ? undefined : v as AuditRiskLevel }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              <div className="col-span-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({})}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}

          {/* Audit Log Entries */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-2 pr-4">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "p-3 rounded-lg border",
                    !entry.success && "bg-destructive/5 border-destructive/20",
                    entry.phi_involved && "bg-warning/5 border-warning/20"
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-start gap-2">
                      <div className={cn("p-1.5 rounded-lg bg-background", getActionColor(entry.action))}>
                        {getActionIcon(entry.action)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium capitalize">
                            {entry.action.replace('_', ' ')}
                          </span>
                          {!entry.success && (
                            <Badge variant="destructive" className="h-5 text-xs">Failed</Badge>
                          )}
                          {entry.phi_involved && (
                            <Badge variant="outline" className="h-5 text-xs gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              PHI
                            </Badge>
                          )}
                          {getRiskBadge(entry.riskLevel)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">{entry.userName}</span> ({entry.userRole})
                          {' • '}
                          <span className="font-mono">{entry.ipAddress}</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatAUDateTimeFull(entry.timestamp)}
                    </span>
                  </div>

                  {entry.metadata && (
                    <div className="bg-background p-2 rounded border text-xs space-y-1">
                      {entry.metadata.reason && (
                        <p><span className="font-medium">Reason:</span> {entry.metadata.reason}</p>
                      )}
                      {entry.metadata.oldValue && entry.metadata.newValue && (
                        <p>
                          <span className="font-medium">Changed from:</span> {entry.metadata.oldValue}
                          {' → '}
                          {entry.metadata.newValue}
                        </p>
                      )}
                      {entry.metadata.sharedWith && entry.metadata.sharedWith.length > 0 && (
                        <p>
                          <span className="font-medium">Shared with:</span> {entry.metadata.sharedWith.join(', ')}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>Resource: {entry.resourceName}</span>
                    <span className="font-mono text-muted-foreground/60">{entry.userAgent.substring(0, 40)}...</span>
                  </div>
                </div>
              ))}

              {filteredEntries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-lg">
                  <Shield className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium mb-1">No Audit Entries Found</p>
                  <p className="text-xs text-muted-foreground">
                    {entries.length === 0
                      ? 'No audit log entries available'
                      : 'Try adjusting your filters to see results'
                    }
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* HIPAA Compliance Info */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-xs font-medium mb-2">HIPAA Compliance</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• All access to PHI (Protected Health Information) is logged</li>
              <li>• Audit logs are retained for minimum 6 years per HIPAA requirements</li>
              <li>• Logs are tamper-proof and include user, timestamp, and action</li>
              <li>• Export capability for compliance audits and investigations</li>
              <li>• High-risk activities are flagged for security review</li>
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
 * Generate mock audit log entries for testing
 */
export function generateMockAuditLog(fileId: string, fileName: string): AuditLogEntry[] {
  const users = [
    { id: 'U001', name: 'Dr. Sarah Chen', email: 'sarah.chen@visionradiology.com.au', role: 'Radiologist' },
    { id: 'U002', name: 'John Smith', email: 'john.smith@visionradiology.com.au', role: 'Admin' },
    { id: 'U003', name: 'Maria Garcia', email: 'maria.garcia@visionradiology.com.au', role: 'HR Manager' },
  ];

  const actions: AuditAction[] = ['view', 'download', 'edit', 'share', 'access_denied'];
  const entries: AuditLogEntry[] = [];

  for (let i = 0; i < 20; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const timestamp = new Date();
    timestamp.setHours(timestamp.getHours() - i * 2);

    entries.push({
      id: `audit_${i}`,
      timestamp: timestamp.toISOString(),
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      action,
      resourceId: fileId,
      resourceName: fileName,
      resourceType: 'file',
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      success: Math.random() > 0.1,
      riskLevel: action === 'access_denied' ? 'critical' : (action === 'share' ? 'high' : (action === 'edit' ? 'medium' : 'low')),
      phi_involved: Math.random() > 0.7,
    });
  }

  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
