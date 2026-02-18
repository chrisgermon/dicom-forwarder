import { format } from "date-fns";
import { Calendar, User, FileText, Target, CalendarCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DetailsPanel, DetailsSection, DetailsField } from "@/components/ui/details-panel";
import { Separator } from "@/components/ui/separator";

export interface MloVisitDetails {
  id: string;
  visit_date: string;
  visit_time: string | null;
  visit_type: string;
  contact_name: string | null;
  contact_role: string | null;
  purpose: string | null;
  notes: string | null;
  outcome: string | null;
  follow_up_date: string | null;
  follow_up_time: string | null;
  follow_up_notes: string | null;
  follow_up_completed: boolean | null;
  visitor_name: string | null;
  visitor_id: string;
  clinic_name?: string | null;
  referrer_name?: string | null;
  location_name?: string | null;
}

const VISIT_TYPE_LABELS: Record<string, string> = {
  site_visit: 'Site Visit',
  phone_call: 'Phone Call',
  video_call: 'Video Call',
  email: 'Email',
  event: 'Event',
  other: 'Other',
};

const OUTCOME_LABELS: Record<string, string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  follow_up_required: 'Follow-up Required',
  issue_raised: 'Issue Raised',
  no_contact: 'No Contact',
};

const OUTCOME_COLORS: Record<string, string> = {
  positive: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  follow_up_required: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  issue_raised: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  no_contact: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

interface MloVisitDetailsPanelProps {
  visit: MloVisitDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MloVisitDetailsPanel({ visit, isOpen, onClose }: MloVisitDetailsPanelProps) {
  if (!visit) return null;

  const formatDateTime = (date: string, time: string | null) => {
    const dateFormatted = format(new Date(date), "EEEE, d MMMM yyyy");
    if (time) {
      const [hours, minutes] = time.split(':');
      const timeFormatted = `${hours}:${minutes}`;
      return `${dateFormatted} at ${timeFormatted}`;
    }
    return dateFormatted;
  };

  return (
    <DetailsPanel isOpen={isOpen} onClose={onClose} title="Visit Details" width="md">
      {/* Visit Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Badge variant="secondary" className="text-sm">
            {VISIT_TYPE_LABELS[visit.visit_type] || visit.visit_type}
          </Badge>
          {visit.outcome && (
            <Badge className={OUTCOME_COLORS[visit.outcome]}>
              {OUTCOME_LABELS[visit.outcome]}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatDateTime(visit.visit_date, visit.visit_time)}</span>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Visitor Info */}
      <DetailsSection title="Visited By">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{visit.visitor_name || 'Unknown'}</span>
        </div>
      </DetailsSection>

      {/* Contact Details */}
      {(visit.contact_name || visit.contact_role) && (
        <DetailsSection title="Contact">
          {visit.contact_name && (
            <DetailsField label="Name" value={visit.contact_name} />
          )}
          {visit.contact_role && (
            <DetailsField label="Role" value={visit.contact_role} />
          )}
        </DetailsSection>
      )}

      {/* Location Info */}
      {(visit.clinic_name || visit.referrer_name || visit.location_name) && (
        <DetailsSection title="Location">
          {visit.clinic_name && (
            <DetailsField label="Clinic" value={visit.clinic_name} />
          )}
          {visit.referrer_name && (
            <DetailsField label="Referrer" value={visit.referrer_name} />
          )}
          {visit.location_name && (
            <DetailsField label="VRG Location" value={visit.location_name} />
          )}
        </DetailsSection>
      )}

      {/* Purpose & Notes */}
      {(visit.purpose || visit.notes) && (
        <DetailsSection title="Visit Details">
          {visit.purpose && (
            <div className="mb-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                <Target className="h-3 w-3" />
                Purpose
              </div>
              <p className="text-sm">{visit.purpose}</p>
            </div>
          )}
          {visit.notes && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                <FileText className="h-3 w-3" />
                Notes
              </div>
              <p className="text-sm whitespace-pre-wrap">{visit.notes}</p>
            </div>
          )}
        </DetailsSection>
      )}

      {/* Follow-up Info */}
      {visit.follow_up_date && (
        <DetailsSection title="Follow-up">
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {formatDateTime(visit.follow_up_date, visit.follow_up_time)}
                </span>
              </div>
              {visit.follow_up_completed ? (
                <Badge variant="default" className="bg-green-600">Completed</Badge>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
            </div>
            {visit.follow_up_notes && (
              <p className="text-sm text-muted-foreground mt-2">{visit.follow_up_notes}</p>
            )}
          </div>
        </DetailsSection>
      )}
    </DetailsPanel>
  );
}
