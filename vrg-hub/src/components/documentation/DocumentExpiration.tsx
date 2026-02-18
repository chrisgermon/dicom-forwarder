import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  Clock,
  Bell,
} from "lucide-react";
import { format, differenceInDays, addDays, addMonths, addYears, isBefore } from "date-fns";
import { cn } from "@/lib/utils";

export interface DocumentExpirationData {
  expirationDate?: Date;
  reminderDays?: number[]; // Days before expiration to remind
  expirationReason?: string;
  renewalRequired?: boolean;
  renewalContact?: string;
}

interface DocumentExpirationProps {
  fileId: string;
  fileName: string;
  expirationData?: DocumentExpirationData;
  onUpdate: (data: DocumentExpirationData) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showBadge?: boolean;
  variant?: 'compact' | 'full';
}

export function getExpirationStatus(expirationDate?: Date): {
  status: 'none' | 'valid' | 'warning' | 'critical' | 'expired';
  label: string;
  variant: 'default' | 'secondary' | 'warning' | 'destructive';
  daysUntil: number;
} {
  if (!expirationDate) {
    return { status: 'none', label: 'No expiration', variant: 'secondary', daysUntil: Infinity };
  }

  const now = new Date();
  const days = differenceInDays(expirationDate, now);

  if (days < 0) {
    return { status: 'expired', label: `Expired ${Math.abs(days)}d ago`, variant: 'destructive', daysUntil: days };
  } else if (days === 0) {
    return { status: 'expired', label: 'Expires today', variant: 'destructive', daysUntil: 0 };
  } else if (days <= 7) {
    return { status: 'critical', label: `${days}d left`, variant: 'destructive', daysUntil: days };
  } else if (days <= 30) {
    return { status: 'warning', label: `${days}d left`, variant: 'warning', daysUntil: days };
  } else {
    return { status: 'valid', label: `${days}d left`, variant: 'default', daysUntil: days };
  }
}

export function DocumentExpiration({
  fileId: _fileId,
  fileName,
  expirationData,
  onUpdate,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  showBadge = true,
  variant = 'compact',
}: DocumentExpirationProps) {
  const [internalShowDialog, setInternalShowDialog] = useState(false);
  const showDialog = controlledOpen !== undefined ? controlledOpen : internalShowDialog;
  const setShowDialog = controlledOnOpenChange || setInternalShowDialog;
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(expirationData?.expirationDate);
  const [reminderDays, setReminderDays] = useState<number[]>(expirationData?.reminderDays || [30, 14, 7, 1]);
  const [expirationReason, setExpirationReason] = useState(expirationData?.expirationReason || '');
  const [renewalRequired, setRenewalRequired] = useState(expirationData?.renewalRequired || false);
  const [renewalContact, setRenewalContact] = useState(expirationData?.renewalContact || '');
  const [quickSelect, setQuickSelect] = useState<string>('custom');

  const status = getExpirationStatus(expirationDate);

  const handleQuickSelect = (value: string) => {
    setQuickSelect(value);
    const today = new Date();

    switch (value) {
      case '30days':
        setExpirationDate(addDays(today, 30));
        break;
      case '90days':
        setExpirationDate(addDays(today, 90));
        break;
      case '6months':
        setExpirationDate(addMonths(today, 6));
        break;
      case '1year':
        setExpirationDate(addYears(today, 1));
        break;
      case '2years':
        setExpirationDate(addYears(today, 2));
        break;
      case '3years':
        setExpirationDate(addYears(today, 3));
        break;
      case 'custom':
        // Keep current date
        break;
      case 'none':
        setExpirationDate(undefined);
        break;
    }
  };

  const handleSave = () => {
    onUpdate({
      expirationDate,
      reminderDays,
      expirationReason,
      renewalRequired,
      renewalContact,
    });
    setShowDialog(false);
  };

  const handleRemove = () => {
    setExpirationDate(undefined);
    setReminderDays([30, 14, 7, 1]);
    setExpirationReason('');
    setRenewalRequired(false);
    setRenewalContact('');
    onUpdate({});
    setShowDialog(false);
  };

  if (variant === 'compact') {
    return (
      <>
        {showBadge && expirationDate && (
          <Badge
            variant={status.variant}
            className="gap-1 cursor-pointer"
            onClick={() => setShowDialog(true)}
          >
            {status.status === 'expired' || status.status === 'critical' ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <Clock className="h-3 w-3" />
            )}
            {status.label}
          </Badge>
        )}

        {!expirationDate && showBadge && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowDialog(true)}
          >
            <CalendarIcon className="h-3 w-3" />
            Set expiration
          </Button>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Document Expiration</DialogTitle>
              <DialogDescription>
                Set expiration date and reminders for {fileName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Quick Select */}
              <div className="space-y-2">
                <Label>Quick Select</Label>
                <Select value={quickSelect} onValueChange={handleQuickSelect}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30days">30 Days</SelectItem>
                    <SelectItem value="90days">90 Days</SelectItem>
                    <SelectItem value="6months">6 Months</SelectItem>
                    <SelectItem value="1year">1 Year</SelectItem>
                    <SelectItem value="2years">2 Years</SelectItem>
                    <SelectItem value="3years">3 Years</SelectItem>
                    <SelectItem value="custom">Custom Date</SelectItem>
                    <SelectItem value="none">No Expiration</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Picker */}
              {quickSelect !== 'none' && (
                <div className="space-y-2">
                  <Label>Expiration Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !expirationDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expirationDate ? format(expirationDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={expirationDate}
                        onSelect={setExpirationDate}
                        disabled={(date) => isBefore(date, new Date())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Reminder Days */}
              {expirationDate && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Reminder Days Before Expiration
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 3, 7, 14, 30, 60, 90].map((days) => (
                      <Badge
                        key={days}
                        variant={reminderDays.includes(days) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          if (reminderDays.includes(days)) {
                            setReminderDays(reminderDays.filter(d => d !== days));
                          } else {
                            setReminderDays([...reminderDays, days].sort((a, b) => b - a));
                          }
                        }}
                      >
                        {days}d
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selected: {reminderDays.sort((a, b) => b - a).join(', ')} days before
                  </p>
                </div>
              )}

              {/* Expiration Reason */}
              {expirationDate && (
                <div className="space-y-2">
                  <Label>Reason for Expiration (Optional)</Label>
                  <Textarea
                    placeholder="e.g., Annual policy review, Equipment certification renewal"
                    value={expirationReason}
                    onChange={(e) => setExpirationReason(e.target.value)}
                    rows={2}
                  />
                </div>
              )}

              {/* Renewal Required */}
              {expirationDate && (
                <div className="space-y-2">
                  <Label>Renewal Information</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="renewal-required"
                      checked={renewalRequired}
                      onChange={(e) => setRenewalRequired(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="renewal-required" className="text-sm cursor-pointer">
                      Renewal required after expiration
                    </label>
                  </div>
                  {renewalRequired && (
                    <Textarea
                      placeholder="Contact person or process for renewal"
                      value={renewalContact}
                      onChange={(e) => setRenewalContact(e.target.value)}
                      rows={2}
                    />
                  )}
                </div>
              )}

              {/* Current Status */}
              {expirationDate && (
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Current Status:</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Expires: {format(expirationDate, "PPP")}
                  </p>
                  {reminderDays.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Reminders will be sent {reminderDays.length} times before expiration
                    </p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              {expirationDate && (
                <Button variant="outline" onClick={handleRemove}>
                  Remove Expiration
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Full variant (for dedicated page/panel)
  return <div>Full variant not implemented yet</div>;
}

// Helper component for displaying expiration warnings
export function ExpirationWarningBanner({
  expiringFiles,
  onViewFile,
}: {
  expiringFiles: Array<{ id: string; name: string; expirationDate: Date }>;
  onViewFile: (fileId: string) => void;
}) {
  if (expiringFiles.length === 0) return null;

  const critical = expiringFiles.filter(f => {
    const days = differenceInDays(f.expirationDate, new Date());
    return days <= 7 && days >= 0;
  });

  const expired = expiringFiles.filter(f => {
    const days = differenceInDays(f.expirationDate, new Date());
    return days < 0;
  });

  if (critical.length === 0 && expired.length === 0) return null;

  return (
    <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          {expired.length > 0 && (
            <div>
              <p className="font-semibold text-destructive">
                {expired.length} Document{expired.length !== 1 ? 's' : ''} Expired
              </p>
              <ul className="text-sm space-y-1 mt-1">
                {expired.slice(0, 3).map((file) => (
                  <li key={file.id}>
                    <button
                      onClick={() => onViewFile(file.id)}
                      className="hover:underline text-left"
                    >
                      {file.name} - Expired {Math.abs(differenceInDays(file.expirationDate, new Date()))}d ago
                    </button>
                  </li>
                ))}
                {expired.length > 3 && (
                  <li className="text-muted-foreground">
                    and {expired.length - 3} more...
                  </li>
                )}
              </ul>
            </div>
          )}

          {critical.length > 0 && (
            <div>
              <p className="font-semibold text-warning">
                {critical.length} Document{critical.length !== 1 ? 's' : ''} Expiring Soon
              </p>
              <ul className="text-sm space-y-1 mt-1">
                {critical.slice(0, 3).map((file) => (
                  <li key={file.id}>
                    <button
                      onClick={() => onViewFile(file.id)}
                      className="hover:underline text-left"
                    >
                      {file.name} - {differenceInDays(file.expirationDate, new Date())}d left
                    </button>
                  </li>
                ))}
                {critical.length > 3 && (
                  <li className="text-muted-foreground">
                    and {critical.length - 3} more...
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
