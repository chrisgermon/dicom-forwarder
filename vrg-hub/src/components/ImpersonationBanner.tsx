import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserImpersonation } from "@/hooks/useUserImpersonation";
import { useAuth } from "@/hooks/useAuth";

export function ImpersonationBanner() {
  const { userRole } = useAuth();
  const { impersonatedUser, clearImpersonation, isImpersonating } = useUserImpersonation(userRole);

  if (!isImpersonating || !impersonatedUser) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-950 px-4 py-2 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" />
        <span className="font-medium">
          Impersonation Mode: Viewing system as {impersonatedUser.full_name || impersonatedUser.email} ({impersonatedUser.role})
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={clearImpersonation}
        className="hover:bg-yellow-600/20"
      >
        <X className="w-4 h-4 mr-2" />
        Exit Impersonation
      </Button>
    </div>
  );
}
