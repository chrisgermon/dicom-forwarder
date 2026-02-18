import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { ReferringPractitioner } from "@/hooks/useMloBigQueryData";
import { TrendIndicator } from "./TrendIndicator";

interface PreviousPeriodData {
  total_patients?: number;
  total_requests?: number;
  total_procedures?: number;
}

interface BigQueryReferrerTableProps {
  referrers: ReferringPractitioner[];
  onSelectReferrer: (referrer: ReferringPractitioner) => void;
  isLoading?: boolean;
  previousPeriodMap?: Map<string, PreviousPeriodData>;
}

export function BigQueryReferrerTable({ referrers, onSelectReferrer, isLoading, previousPeriodMap }: BigQueryReferrerTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!referrers || referrers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No referring practitioners found for this worksite
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch {
      return '-';
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Practitioner Name</TableHead>
          <TableHead>Provider Code</TableHead>
          <TableHead className="text-right">Patients</TableHead>
          <TableHead className="text-right">Requests</TableHead>
          <TableHead className="text-right">Procedures</TableHead>
          <TableHead className="text-right">Last Referral</TableHead>
          <TableHead className="w-8"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {referrers.map((referrer) => {
          const prev = previousPeriodMap?.get(referrer.PractitionerKey);
          const procedures = parseInt(referrer.total_procedures?.toString() || '0');
          const patients = parseInt(referrer.total_patients?.toString() || '0');
          const requests = parseInt(referrer.total_requests?.toString() || '0');
          const prevProcedures = parseInt(prev?.total_procedures?.toString() || '0');
          const prevPatients = parseInt(prev?.total_patients?.toString() || '0');
          const prevRequests = parseInt(prev?.total_requests?.toString() || '0');

          return (
            <TableRow
              key={referrer.PractitionerKey}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelectReferrer(referrer)}
            >
              <TableCell className="font-medium">{referrer.PractitionerName}</TableCell>
              <TableCell className="text-muted-foreground">{referrer.PractitionerCode || '-'}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Badge variant="outline">
                    {patients.toLocaleString()}
                  </Badge>
                  {prev && <TrendIndicator current={patients} previous={prevPatients} size="sm" />}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Badge variant="outline">
                    {requests.toLocaleString()}
                  </Badge>
                  {prev && <TrendIndicator current={requests} previous={prevRequests} size="sm" />}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Badge variant="secondary">
                    {procedures.toLocaleString()}
                  </Badge>
                  {prev && <TrendIndicator current={procedures} previous={prevProcedures} size="sm" />}
                </div>
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatDate(referrer.last_referral)}
              </TableCell>
              <TableCell>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
