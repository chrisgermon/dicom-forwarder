import { NotifyreFaxCampaigns } from "@/components/notifyre/NotifyreFaxCampaigns";
import { usePermissions } from "@/hooks/usePermissions";
import { useCompanyFeatures } from "@/hooks/useCompanyFeatures";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function NotifyreFaxLogs() {
  const { hasPermission } = usePermissions();
  const { isFeatureEnabled } = useCompanyFeatures();

  if (!hasPermission('view_fax_campaigns') || !isFeatureEnabled('fax_campaigns')) {
    return (
      <div className="container-responsive py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              You don't have permission to view fax campaigns. Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-responsive py-6 space-y-6">
      <NotifyreFaxCampaigns />
    </div>
  );
}