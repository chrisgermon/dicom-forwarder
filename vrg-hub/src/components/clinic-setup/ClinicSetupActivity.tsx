import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Activity, CheckCircle2, Edit, Loader2, FileText } from "lucide-react";

interface ActivityLog {
  id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  item?: { field_name: string } | null;
  profile?: { full_name: string; email: string } | null;
}

interface ClinicSetupActivityProps {
  checklistId: string;
}

export function ClinicSetupActivity({ checklistId }: ClinicSetupActivityProps) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["clinic-setup-activity", checklistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_setup_activity")
        .select(`
          id,
          action,
          old_value,
          new_value,
          created_at,
          item_id
        `)
        .eq("checklist_id", checklistId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch item details and user profiles separately
      const itemIds = data.filter(a => a.item_id).map(a => a.item_id);
      const { data: items } = await supabase
        .from("clinic_setup_items")
        .select("id, field_name")
        .in("id", itemIds);

      const itemMap = new Map(items?.map(i => [i.id, i]) || []);

      return data.map(activity => ({
        ...activity,
        item: itemMap.get(activity.item_id) || null,
      })) as ActivityLog[];
    },
    enabled: !!checklistId,
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "update":
        return <Edit className="h-4 w-4 text-blue-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionBadge = (action: string, newValue: string | null) => {
    if (newValue === "completed") {
      return <Badge className="bg-green-500 text-xs">Completed</Badge>;
    }
    if (newValue === "uncompleted") {
      return <Badge variant="outline" className="text-xs">Uncompleted</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">{action}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {activities && activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex gap-3 pb-4 border-b last:border-0">
                  <div className="mt-1">{getActionIcon(activity.action)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {activity.item?.field_name || "Item"}
                      </span>
                      {getActionBadge(activity.action, activity.new_value)}
                    </div>
                    {activity.new_value && !["completed", "uncompleted"].includes(activity.new_value) && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        → {activity.new_value}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(activity.created_at), "MMM dd, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No activity recorded yet
            </p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
