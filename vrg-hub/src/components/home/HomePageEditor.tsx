import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { Widget } from "./editor/types";

interface HomePageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLayout: Widget[];
  companyId: string | null | undefined;
}

export function HomePageEditor({ open, onOpenChange }: Omit<HomePageEditorProps, 'initialLayout' | 'companyId'>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Home Page Editor</DialogTitle>
          <DialogDescription>
            Customize your home page layout
          </DialogDescription>
        </DialogHeader>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Home page editor is not available in single-tenant mode.
          </AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>
  );
}
