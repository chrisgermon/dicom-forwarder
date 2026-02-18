import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageId: string;
}

export function VersionHistoryDialog({ open, onOpenChange }: VersionHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Version history is not available in single-tenant mode.
              </AlertDescription>
            </Alert>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
