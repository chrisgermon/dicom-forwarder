import { CheckCircle, Loader2, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutoSaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
}

export function AutoSaveIndicator({ isSaving, lastSaved, hasUnsavedChanges }: AutoSaveIndicatorProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
      isSaving 
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        : hasUnsavedChanges
          ? "bg-muted text-muted-foreground"
          : lastSaved
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-muted text-muted-foreground"
    )}>
      {isSaving ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Saving...</span>
        </>
      ) : hasUnsavedChanges ? (
        <>
          <Cloud className="h-3.5 w-3.5" />
          <span>Unsaved changes</span>
        </>
      ) : lastSaved ? (
        <>
          <CheckCircle className="h-3.5 w-3.5" />
          <span>All changes saved</span>
        </>
      ) : (
        <>
          <Cloud className="h-3.5 w-3.5" />
          <span>Auto-save enabled</span>
        </>
      )}
    </div>
  );
}
