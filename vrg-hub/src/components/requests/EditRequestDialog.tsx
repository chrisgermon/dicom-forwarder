import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';

interface EditRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: any;
}

export function EditRequestDialog({
  open,
  onOpenChange,
  request,
}: EditRequestDialogProps) {
  const navigate = useNavigate();

  const handleEdit = () => {
    onOpenChange(false);
    navigate(`/requests/${request.id}/edit`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Request</DialogTitle>
          <DialogDescription>
            Open the full editor to modify all request details
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Click the button below to open the full-page editor where you can modify:
          </p>
          <ul className="text-sm space-y-2 mb-6">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Title and description with rich text formatting</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Priority level</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>CC email recipients</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Business justification</span>
            </li>
          </ul>
          <Button onClick={handleEdit} className="w-full">
            <Edit className="mr-2 h-4 w-4" />
            Open Full Editor
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
