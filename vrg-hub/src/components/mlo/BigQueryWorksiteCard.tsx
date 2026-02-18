import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ClipboardList, FileText, Calendar, User } from "lucide-react";
import { WorksiteSummary } from "@/hooks/useMloBigQueryData";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { TrendIndicator } from "./TrendIndicator";

interface AssignedMlo {
  id: string;
  full_name: string | null;
  email: string;
}

interface PreviousPeriodData {
  total_patients?: number;
  total_requests?: number;
  total_procedures?: number;
}

interface BigQueryWorksiteCardProps {
  worksite: WorksiteSummary;
  onClick: () => void;
  target?: number;
  assignedMlo?: AssignedMlo | null;
  previousPeriod?: PreviousPeriodData | null;
}

export function BigQueryWorksiteCard({ worksite, onClick, target, assignedMlo, previousPeriod }: BigQueryWorksiteCardProps) {
  const procedures = parseInt(worksite.total_procedures?.toString() || '0');
  const patients = parseInt(worksite.total_patients?.toString() || '0');
  const requests = parseInt(worksite.total_requests?.toString() || '0');
  const progress = target ? Math.min((procedures / target) * 100, 100) : null;

  const prevProcedures = parseInt(previousPeriod?.total_procedures?.toString() || '0');
  const prevPatients = parseInt(previousPeriod?.total_patients?.toString() || '0');
  const prevRequests = parseInt(previousPeriod?.total_requests?.toString() || '0');

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'dd MMM');
    } catch {
      return 'N/A';
    }
  };

  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="truncate">{worksite.WorkSiteName}</span>
          {target && progress !== null && (
            <Badge variant={progress >= 100 ? "default" : progress >= 75 ? "secondary" : "outline"}>
              {Math.round(progress)}%
            </Badge>
          )}
        </CardTitle>
        {target && progress !== null && (
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div 
              className="bg-primary rounded-full h-2 transition-all" 
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" />
              <span className="text-xs">Patients</span>
            </div>
            <div className="text-lg font-semibold">{patients.toLocaleString()}</div>
            {previousPeriod && (
              <TrendIndicator current={patients} previous={prevPatients} size="sm" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <ClipboardList className="h-3 w-3" />
              <span className="text-xs">Requests</span>
            </div>
            <div className="text-lg font-semibold">{requests.toLocaleString()}</div>
            {previousPeriod && (
              <TrendIndicator current={requests} previous={prevRequests} size="sm" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span className="text-xs">Procedures</span>
            </div>
            <div className="text-lg font-semibold text-primary">{procedures.toLocaleString()}</div>
            {previousPeriod && (
              <TrendIndicator current={procedures} previous={prevProcedures} size="sm" />
            )}
          </div>
        </div>

        {/* Assigned MLO */}
        {assignedMlo && (
          <div className="flex items-center gap-1 text-xs pt-2 border-t">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">MLO:</span>
            <Link
              to={`/mlo-performance/${assignedMlo.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-primary hover:underline font-medium"
            >
              {assignedMlo.full_name || assignedMlo.email}
            </Link>
          </div>
        )}

        {worksite.last_request && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground justify-center pt-2 border-t">
            <Calendar className="h-3 w-3" />
            <span>Last activity: {formatDate(worksite.last_request)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
