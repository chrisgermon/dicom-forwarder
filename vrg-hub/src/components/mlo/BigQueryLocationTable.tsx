import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Building } from "lucide-react";
import { PractitionerLocation } from "@/hooks/useMloBigQueryData";
import { TrendIndicator } from "./TrendIndicator";

interface PreviousPeriodData {
  practitioner_count?: number;
  total_patients?: number;
  total_requests?: number;
  total_procedures?: number;
}

interface BigQueryLocationTableProps {
  locations: PractitionerLocation[];
  onSelectLocation: (location: PractitionerLocation) => void;
  isLoading?: boolean;
  previousPeriodMap?: Map<string, PreviousPeriodData>;
}

export function BigQueryLocationTable({ locations, onSelectLocation, isLoading, previousPeriodMap }: BigQueryLocationTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!locations || locations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No practitioner locations found for this worksite
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
          <TableHead>Location Name</TableHead>
          <TableHead>Location Code</TableHead>
          <TableHead className="text-right">Practitioners</TableHead>
          <TableHead className="text-right">Patients</TableHead>
          <TableHead className="text-right">Procedures</TableHead>
          <TableHead className="text-right">Last Referral</TableHead>
          <TableHead className="w-8"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {locations.map((location) => {
          const prev = previousPeriodMap?.get(location.LocationKey);
          const procedures = parseInt(location.total_procedures?.toString() || '0');
          const patients = parseInt(location.total_patients?.toString() || '0');
          const practitioners = parseInt(location.practitioner_count?.toString() || '0');
          const prevProcedures = parseInt(prev?.total_procedures?.toString() || '0');
          const prevPatients = parseInt(prev?.total_patients?.toString() || '0');
          const prevPractitioners = parseInt(prev?.practitioner_count?.toString() || '0');

          return (
            <TableRow
              key={location.LocationKey}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelectLocation(location)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{location.LocationName}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{location.LocationCode || '-'}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Badge variant="outline">
                    {practitioners.toLocaleString()}
                  </Badge>
                  {prev && <TrendIndicator current={practitioners} previous={prevPractitioners} size="sm" />}
                </div>
              </TableCell>
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
                  <Badge variant="secondary">
                    {procedures.toLocaleString()}
                  </Badge>
                  {prev && <TrendIndicator current={procedures} previous={prevProcedures} size="sm" />}
                </div>
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatDate(location.last_referral)}
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
