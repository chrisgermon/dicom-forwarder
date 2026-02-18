import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Printer, MapPin } from 'lucide-react';
import { Clinic } from '@/types/directory';

interface ClinicCardProps {
  clinic: Clinic;
}

export function ClinicCard({ clinic }: ClinicCardProps) {
  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold">{clinic.name}</CardTitle>
          {clinic.region && (
            <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 bg-muted rounded">
              {clinic.region}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="space-y-2">
          <a 
            href={`tel:${clinic.phone.replace(/\s/g, '')}`} 
            className="flex items-center gap-2.5 text-sm group"
          >
            <Phone className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-foreground group-hover:text-primary transition-colors font-medium">
              {clinic.phone}
            </span>
          </a>
          
          {clinic.fax && (
            <div className="flex items-center gap-2.5 text-sm">
              <Printer className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">{clinic.fax}</span>
            </div>
          )}
          
          <div className="flex items-start gap-2.5 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground text-xs leading-relaxed">{clinic.address}</span>
          </div>
        </div>

        {clinic.extensions.length > 0 && (
          <div className="pt-3 mt-3 border-t">
            <h4 className="font-semibold text-xs mb-2 text-foreground uppercase tracking-wide">
              Extensions
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {clinic.extensions.map((ext, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate">{ext.name}</span>
                  <span className="font-mono font-medium text-foreground ml-2">{ext.number}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
