import { Loader2 } from "lucide-react";

export function RouteLoading() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center space-y-2">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading page...</p>
      </div>
    </div>
  );
}
