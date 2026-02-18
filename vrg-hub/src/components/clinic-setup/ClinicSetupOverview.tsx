import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { Calendar, MapPin, Building2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { ClinicSetupChecklist, ClinicSetupSection } from "@/hooks/useClinicSetupChecklists";

interface ClinicSetupOverviewProps {
  checklist: ClinicSetupChecklist;
  sections: ClinicSetupSection[];
}

export function ClinicSetupOverview({ checklist, sections }: ClinicSetupOverviewProps) {
  // Calculate stats
  const totalItems = sections.reduce((acc, s) => acc + (s.items?.length || 0), 0);
  const completedItems = sections.reduce(
    (acc, s) => acc + (s.items?.filter(i => i.is_completed).length || 0),
    0
  );
  const pendingItems = totalItems - completedItems;
  const completionPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Stats by owner (using owner_profile if available, fallback to section_owner text)
  const ownerStats = sections.reduce((acc, section) => {
    const ownerName = section.owner_profile?.full_name || section.section_owner || "Unassigned";
    if (!acc[ownerName]) {
      acc[ownerName] = { total: 0, completed: 0 };
    }
    acc[ownerName].total += section.items?.length || 0;
    acc[ownerName].completed += section.items?.filter(i => i.is_completed).length || 0;
    return acc;
  }, {} as Record<string, { total: number; completed: number }>);

  // Section stats
  const completedSections = sections.filter(s => {
    const total = s.items?.length || 0;
    const completed = s.items?.filter(i => i.is_completed).length || 0;
    return total > 0 && completed === total;
  }).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in_progress": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-4">
      {/* Key Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Brand</p>
                <p className="font-semibold truncate">{checklist.brand?.display_name || "No brand"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Go-Live Date</p>
                <p className="font-semibold">
                  {checklist.go_live_date 
                    ? format(new Date(checklist.go_live_date), "MMM dd, yyyy")
                    : "Not set"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <MapPin className="h-5 w-5 text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-semibold truncate">{checklist.location?.name || "Not set"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className={`p-2 ${getStatusColor(checklist.status)}/10 rounded-lg`}>
                {checklist.status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-blue-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={checklist.status === "completed" ? "default" : "secondary"}>
                  {checklist.status.replace("_", " ")}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-primary">{completionPercent}%</span>
                <span className="text-muted-foreground">
                  {completedItems} of {totalItems} items
                </span>
              </div>
              <Progress value={completionPercent} className="h-3" />
              
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-2xl font-bold text-green-600">{completedItems}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-2xl font-bold text-amber-600">{pendingItems}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    <span className="text-2xl font-bold text-blue-600">{completedSections}/{sections.length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Sections Done</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Progress by Owner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[200px] overflow-y-auto">
              {Object.entries(ownerStats)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([owner, stats]) => {
                  const percent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                  return (
                    <div key={owner} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate">{owner}</span>
                        <span className="text-muted-foreground">{stats.completed}/{stats.total}</span>
                      </div>
                      <Progress value={percent} className="h-2" />
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
