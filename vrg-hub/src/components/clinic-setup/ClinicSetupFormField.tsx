import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Circle, Upload, ExternalLink, FileIcon, Loader2, Lock, Unlock, User } from "lucide-react";
import { ClinicSetupItem } from "@/hooks/useClinicSetupChecklists";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { StaffAssignmentSelect } from "./StaffAssignmentSelect";

interface ClinicSetupFormFieldProps {
  item: ClinicSetupItem;
  onUpdate: (updates: Partial<ClinicSetupItem>) => Promise<void>;
  disabled?: boolean;
}

interface FieldOptions {
  options?: string[] | null;
  placeholder?: string | null;
  description?: string | null;
  hasFileUpload?: boolean;
}

export function ClinicSetupFormField({ item, onUpdate, disabled }: ClinicSetupFormFieldProps) {
  const [value, setValue] = useState(item.field_value || "");
  const [notes, setNotes] = useState(item.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [unlockReason, setUnlockReason] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const options = (item.field_options as FieldOptions) || {};
  const isLocked = (item as any).is_locked || false;

  // Sync local state with prop changes
  useEffect(() => {
    setValue(item.field_value || "");
    setNotes(item.notes || "");
  }, [item.field_value, item.notes]);

  // Auto-save with debounce for text inputs
  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      handleSaveValue(newValue);
    }, 500);
  };

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      handleSaveNotes(newNotes);
    }, 500);
  };

  const handleSaveValue = async (newValue: string) => {
    if (newValue === item.field_value) return;
    setIsSaving(true);
    try {
      await onUpdate({ field_value: newValue });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotes = async (newNotes: string) => {
    if (newNotes === item.notes) return;
    setIsSaving(true);
    try {
      await onUpdate({ notes: newNotes });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleComplete = async () => {
    if (isLocked) return;
    setIsSaving(true);
    try {
      await onUpdate({ is_completed: !item.is_completed });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBooleanChange = async (newValue: boolean) => {
    if (isLocked) return;
    setIsSaving(true);
    try {
      await onUpdate({ field_value: newValue ? "Yes" : "No" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectChange = async (newValue: string) => {
    if (isLocked) return;
    setIsSaving(true);
    try {
      await onUpdate({ field_value: newValue });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLock = async () => {
    setIsSaving(true);
    try {
      await onUpdate({ 
        is_locked: true,
        locked_at: new Date().toISOString(),
      } as any);
      toast.success("Field locked");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlock = async () => {
    if (!unlockReason.trim()) {
      toast.error("Please provide a reason for unlocking");
      return;
    }
    setIsSaving(true);
    try {
      await onUpdate({ 
        is_locked: false,
        unlock_reason: unlockReason,
        locked_at: null,
      } as any);
      setShowUnlockDialog(false);
      setUnlockReason("");
      toast.success("Field unlocked");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isLocked) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${item.id}-${Date.now()}.${fileExt}`;
      const filePath = `clinic-setup/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const currentNotes = item.notes || "";
      const fileEntry = `[File: ${file.name}](${publicUrl})`;
      const newNotes = currentNotes ? `${currentNotes}\n${fileEntry}` : fileEntry;
      
      await onUpdate({ notes: newNotes });
      setNotes(newNotes);
      toast.success("File uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const renderFieldInput = () => {
    const fieldDisabled = disabled || isSaving || isLocked;

    switch (item.field_type) {
      case "boolean":
        return (
          <RadioGroup
            value={value || ""}
            onValueChange={(newValue) => handleBooleanChange(newValue === "Yes")}
            className="flex items-center gap-4"
            disabled={fieldDisabled}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Yes" id={`${item.id}-yes`} />
              <Label htmlFor={`${item.id}-yes`} className="text-sm font-normal cursor-pointer">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="No" id={`${item.id}-no`} />
              <Label htmlFor={`${item.id}-no`} className="text-sm font-normal cursor-pointer">No</Label>
            </div>
          </RadioGroup>
        );

      case "select":
        return (
          <Select
            value={value}
            onValueChange={handleSelectChange}
            disabled={fieldDisabled}
          >
            <SelectTrigger className="w-full h-8">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {options.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "date":
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleValueChange(e.target.value)}
            disabled={fieldDisabled}
            className="h-8"
          />
        );

      case "url":
        return (
          <div className="space-y-1">
            <Input
              type="url"
              value={value}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder={options.placeholder || "https://..."}
              disabled={fieldDisabled}
              className="h-8"
            />
            {value && (
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Open link
              </a>
            )}
          </div>
        );

      case "file":
        return (
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              disabled={fieldDisabled || isUploading}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => fileInputRef.current?.click()}
              disabled={fieldDisabled || isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload File
            </Button>
            {notes && (
              <div className="text-sm text-muted-foreground">
                {notes.split('\n').map((line, i) => {
                  const match = line.match(/\[File: (.+?)\]\((.+?)\)/);
                  if (match) {
                    return (
                      <a
                        key={i}
                        href={match[2]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <FileIcon className="h-3 w-3" />
                        {match[1]}
                      </a>
                    );
                  }
                  return <p key={i}>{line}</p>;
                })}
              </div>
            )}
          </div>
        );

      case "address":
        return (
          <AddressAutocomplete
            value={value}
            onChange={handleValueChange}
            placeholder={options.placeholder || "Start typing to search for an address..."}
            disabled={fieldDisabled}
          />
        );

      case "textarea":
        return (
          <div className="space-y-2">
            <Textarea
              value={value}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder={options.placeholder || "Enter details..."}
              className="min-h-[60px] text-sm"
              disabled={fieldDisabled}
            />
          </div>
        );

      case "number":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={options.placeholder || "0"}
            disabled={fieldDisabled}
            className="h-8"
          />
        );

      default: // text
        return (
          <Input
            value={value}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={options.placeholder || "Enter value..."}
            disabled={fieldDisabled}
            className="h-8"
          />
        );
    }
  };

  return (
    <>
      <div className={cn(
        "p-3 rounded-lg border bg-card transition-all relative",
        item.is_completed && "bg-green-50/50 dark:bg-green-950/10 border-green-200",
        isLocked && "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700",
        !item.is_completed && !isLocked && "hover:border-primary/30"
      )}>
        {/* Locked indicator banner */}
        {isLocked && (
          <div className="absolute -top-2 left-3 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-semibold uppercase tracking-wide rounded-sm flex items-center gap-1 shadow-sm">
            <Lock className="h-2.5 w-2.5" />
            Locked
          </div>
        )}
        
        <div className={cn("flex items-start gap-2", isLocked && "mt-1")}>
          {/* Completion checkbox */}
          <button 
            onClick={handleToggleComplete} 
            className={cn(
              "mt-0.5 flex-shrink-0 transition-colors",
              isLocked && "cursor-not-allowed opacity-50"
            )}
            disabled={disabled || isSaving || isLocked}
            title={isLocked ? "Field is locked" : item.is_completed ? "Mark incomplete" : "Mark complete"}
          >
            {item.is_completed ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
            )}
          </button>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                <Label className={cn(
                  "text-sm font-medium leading-tight",
                  item.is_completed && "line-through text-muted-foreground",
                  isLocked && "text-amber-800 dark:text-amber-200"
                )}>
                  {item.field_name}
                </Label>
                {options.description && (
                  <span className="text-xs text-muted-foreground">({options.description})</span>
                )}
                {isSaving && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Lock/Unlock button */}
              {!disabled && (
                <Button
                  variant={isLocked ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-7 shrink-0 gap-1.5 text-xs font-medium transition-all",
                    isLocked 
                      ? "bg-amber-500 hover:bg-amber-600 text-white px-2.5" 
                      : "h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  onClick={() => isLocked ? setShowUnlockDialog(true) : handleLock()}
                  disabled={isSaving}
                  title={isLocked ? "Click to unlock (requires reason)" : "Lock this field"}
                >
                  {isLocked ? (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      Unlock
                    </>
                  ) : (
                    <Unlock className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            {/* Staff assignment */}
            <div className="flex items-center gap-2 mt-1">
              {item.assigned_profile ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {item.assigned_profile.full_name || item.assigned_profile.email}
                </span>
              ) : null}
              {!disabled && (
                <StaffAssignmentSelect
                  value={item.assigned_to}
                  onChange={async (userId) => {
                    await onUpdate({ assigned_to: userId } as any);
                  }}
                  disabled={isLocked}
                  placeholder={item.assigned_to ? "Reassign" : "Assign"}
                />
              )}
            </div>

            {renderFieldInput()}
            
            {/* Notes field for non-file types */}
            {item.field_type !== "file" && item.field_type !== "textarea" && (
              <Input
                value={notes && !notes.includes("[File:") ? notes : ""}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Notes (optional)..."
                disabled={disabled || isSaving || isLocked}
                className="h-7 text-xs bg-muted/50"
              />
            )}

            {/* File upload button for fields that support it */}
            {options.hasFileUpload && item.field_type !== "file" && (
              <div className="pt-1.5 border-t mt-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={disabled || isUploading || isLocked}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || isUploading || isLocked}
                >
                  {isUploading ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Upload className="h-3 w-3 mr-1" />
                  )}
                  Attach
                </Button>
                {notes && notes.includes("[File:") && (
                  <div className="mt-1.5 text-xs">
                    {notes.split('\n').filter(line => line.includes("[File:")).map((line, i) => {
                      const match = line.match(/\[File: (.+?)\]\((.+?)\)/);
                      if (match) {
                        return (
                          <a
                            key={i}
                            href={match[2]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <FileIcon className="h-3 w-3" />
                            {match[1]}
                          </a>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Show unlock reason if it exists */}
            {(item as any).unlock_reason && (
              <p className="text-xs text-muted-foreground italic">
                Last unlock reason: {(item as any).unlock_reason}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Unlock Dialog */}
      <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Field</DialogTitle>
            <DialogDescription>
              Please provide a reason for unlocking "{item.field_name}". This will be logged for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={unlockReason}
            onChange={(e) => setUnlockReason(e.target.value)}
            placeholder="Enter reason for unlocking this field..."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnlockDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUnlock} disabled={isSaving || !unlockReason.trim()}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Unlock Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}