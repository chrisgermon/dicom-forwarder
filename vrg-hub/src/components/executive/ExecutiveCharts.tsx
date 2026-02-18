import { useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Tooltip
} from "recharts";
import type { RevenueTrend, ModalityRevenue, TopRadiologist, TopWorksite } from "@/hooks/useExecutiveDashboard";

// CSV export utility
function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(value ?? '');
        return stringValue.includes(',') || stringValue.includes('"')
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--info))',
  'hsl(var(--accent))',
  'hsl(var(--destructive))',
  'hsl(var(--modality-mri))',
  'hsl(var(--modality-mammography))',
];

interface ExecutiveChartsProps {
  revenueTrend?: RevenueTrend[];
  revenueByModality?: ModalityRevenue[];
  topRadiologists?: TopRadiologist[];
  topWorksites?: TopWorksite[];
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatDay(dayStr: string): string {
  const [, month, day] = dayStr.split('-');
  return `${day}/${month}`;
}

export function ExecutiveCharts({
  revenueTrend,
  revenueByModality,
  topRadiologists,
  topWorksites,
  isLoading
}: ExecutiveChartsProps) {
  const trendData = useMemo(() =>
    revenueTrend?.map(d => ({
      ...d,
      revenue: Number(d.revenue),
      dayLabel: formatDay(d.day)
    })) || [],
  [revenueTrend]);

  // Export handlers
  const handleExportTrend = useCallback(() => {
    if (!revenueTrend?.length) return;
    exportToCSV(
      revenueTrend.map(d => ({
        Date: d.day,
        Revenue: d.revenue,
        'Study Count': d.study_count
      })),
      'revenue-trend'
    );
  }, [revenueTrend]);

  const handleExportModality = useCallback(() => {
    if (!revenueByModality?.length) return;
    exportToCSV(
      revenueByModality.map(d => ({
        Modality: d.Modality,
        Revenue: d.revenue,
        'Study Count': d.study_count
      })),
      'revenue-by-modality'
    );
  }, [revenueByModality]);

  const handleExportRadiologists = useCallback(() => {
    if (!topRadiologists?.length) return;
    exportToCSV(
      topRadiologists.map(d => ({
        Radiologist: d.RadiologistName,
        Revenue: d.revenue,
        'Study Count': d.study_count,
        'Worksite Count': d.worksite_count
      })),
      'top-radiologists'
    );
  }, [topRadiologists]);

  const handleExportWorksites = useCallback(() => {
    if (!topWorksites?.length) return;
    exportToCSV(
      topWorksites.map(d => ({
        Worksite: d.WorkSiteName,
        Revenue: d.revenue,
        'Study Count': d.study_count,
        'Radiologist Count': d.radiologist_count
      })),
      'top-worksites'
    );
  }, [topWorksites]);

  const modalityData = useMemo(() => 
    revenueByModality?.map(d => ({
      name: d.Modality,
      value: Number(d.revenue),
      count: Number(d.study_count)
    })) || [],
  [revenueByModality]);

  const radiologistData = useMemo(() => 
    topRadiologists?.map(d => ({
      name: d.RadiologistName?.length > 20 ? d.RadiologistName.slice(0, 20) + '...' : d.RadiologistName,
      fullName: d.RadiologistName,
      revenue: Number(d.revenue),
      count: Number(d.study_count)
    })).reverse() || [],
  [topRadiologists]);

  const worksiteData = useMemo(() => 
    topWorksites?.map(d => ({
      name: d.WorkSiteName?.length > 25 ? d.WorkSiteName.slice(0, 25) + '...' : d.WorkSiteName,
      fullName: d.WorkSiteName,
      revenue: Number(d.revenue),
      count: Number(d.study_count)
    })).reverse() || [],
  [topWorksites]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Revenue Trend */}
      <Card className="lg:col-span-2 border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">Revenue Trend</CardTitle>
              <CardDescription>Daily revenue performance across the selected period.</CardDescription>
            </div>
            {!isLoading && revenueTrend?.length ? (
              <Button variant="ghost" size="sm" onClick={handleExportTrend} title="Export to CSV">
                <Download className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="dayLabel" 
                  tick={{ fontSize: 10 }} 
                  interval={Math.max(0, Math.floor(trendData.length / 15))}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Revenue by Modality */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">Revenue by Modality</CardTitle>
              <CardDescription>Mix of revenue contribution by modality.</CardDescription>
            </div>
            {!isLoading && revenueByModality?.length ? (
              <Button variant="ghost" size="sm" onClick={handleExportModality} title="Export to CSV">
                <Download className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={modalityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) =>
                    percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ""
                  }
                  labelLine={false}
                >
                  {modalityData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Radiologists */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">Top 10 Radiologists</CardTitle>
              <CardDescription>Highest revenue contributors, descending order.</CardDescription>
            </div>
            {!isLoading && topRadiologists?.length ? (
              <Button variant="ghost" size="sm" onClick={handleExportRadiologists} title="Export to CSV">
                <Download className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={radiologistData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                <Tooltip 
                  formatter={(value: number, _, props) => [formatCurrency(value), props.payload.fullName]}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Worksites */}
      <Card className="lg:col-span-2 border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">Top 10 Worksites</CardTitle>
              <CardDescription>Sites generating the most revenue in the period.</CardDescription>
            </div>
            {!isLoading && topWorksites?.length ? (
              <Button variant="ghost" size="sm" onClick={handleExportWorksites} title="Export to CSV">
                <Download className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={worksiteData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={150} />
                <Tooltip 
                  formatter={(value: number, _, props) => [formatCurrency(value), props.payload.fullName]}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
