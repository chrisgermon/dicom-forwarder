import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Stethoscope, Users, FileText, ClipboardList } from "lucide-react";
import { ReferringPractitioner, PractitionerSummary, PractitionerDaily } from "@/hooks/useMloBigQueryData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";
import { TrendIndicator, TrendBadge } from "./TrendIndicator";

interface PreviousPeriodData {
  total_patients?: number;
  total_requests?: number;
  total_procedures?: number;
}

interface BigQueryReferrerDetailPanelProps {
  referrer: ReferringPractitioner;
  summary: PractitionerSummary | null;
  dailyData: PractitionerDaily[];
  previousPeriod?: PreviousPeriodData | null;
}

export function BigQueryReferrerDetailPanel({ referrer, summary, dailyData, previousPeriod }: BigQueryReferrerDetailPanelProps) {
  // Prepare daily chart data (last 14 days)
  const dailyChartData = useMemo(() => {
    if (!dailyData || dailyData.length === 0) return [];
    
    return dailyData
      .map(item => ({
        date: item.date,
        procedures: parseInt(item.procedure_count?.toString() || '0'),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14);
  }, [dailyData]);

  const totalProcedures = summary?.total_procedures || referrer.total_procedures || 0;
  const totalPatients = summary?.total_patients || referrer.total_patients || 0;
  const totalRequests = summary?.total_requests || referrer.total_requests || 0;

  const prevProcedures = parseInt(previousPeriod?.total_procedures?.toString() || '0');
  const prevPatients = parseInt(previousPeriod?.total_patients?.toString() || '0');
  const prevRequests = parseInt(previousPeriod?.total_requests?.toString() || '0');

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                {referrer.PractitionerName}
              </CardTitle>
              <CardDescription>
                {referrer.PractitionerCode && `Provider Code: ${referrer.PractitionerCode}`}
              </CardDescription>
            </div>
            {previousPeriod && (
              <TrendBadge 
                current={parseInt(totalProcedures?.toString() || '0')} 
                previous={prevProcedures} 
                label="vs prev period"
              />
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{parseInt(totalPatients?.toString() || '0').toLocaleString()}</div>
              {previousPeriod && (
                <TrendIndicator current={parseInt(totalPatients?.toString() || '0')} previous={prevPatients} size="md" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">Unique patients referred</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requests</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{parseInt(totalRequests?.toString() || '0').toLocaleString()}</div>
              {previousPeriod && (
                <TrendIndicator current={parseInt(totalRequests?.toString() || '0')} previous={prevRequests} size="md" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">Total referral requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Procedures</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-primary">{parseInt(totalProcedures?.toString() || '0').toLocaleString()}</div>
              {previousPeriod && (
                <TrendIndicator current={parseInt(totalProcedures?.toString() || '0')} previous={prevProcedures} size="md" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">Total procedures performed</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Daily Activity (Last 14 Days)
          </CardTitle>
          <CardDescription>Procedures per day</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })}
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString('en-AU')}
                  formatter={(value: number) => [value, 'Procedures']}
                />
                <Bar dataKey="procedures" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No daily data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
