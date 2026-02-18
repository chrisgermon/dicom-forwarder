import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface KnowledgeBaseSubcategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  onSuccess: () => void;
}

export function KnowledgeBaseSubcategoryDialog({ open, onOpenChange }: KnowledgeBaseSubcategoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Subcategory</DialogTitle>
          <DialogDescription>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Knowledge base subcategories are not available in single-tenant mode.
              </AlertDescription>
            </Alert>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
