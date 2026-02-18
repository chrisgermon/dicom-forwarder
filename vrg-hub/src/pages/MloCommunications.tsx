import { useState } from "react";
import { format } from "date-fns";
import { Plus, Search, Phone, Mail, Video, MessageSquare, Users, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMloCommunications, useAllMloCommunications, type MloCommunication } from "@/hooks/useMloCrm";
import { useMloRole } from "@/hooks/useMloRole";
import { MloCommunicationForm } from "@/components/mlo/MloCommunicationForm";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  email: { label: 'Email', icon: <Mail className="h-4 w-4" />, color: 'text-blue-500' },
  phone_call: { label: 'Phone Call', icon: <Phone className="h-4 w-4" />, color: 'text-green-500' },
  meeting: { label: 'Meeting', icon: <Users className="h-4 w-4" />, color: 'text-purple-500' },
  video_call: { label: 'Video Call', icon: <Video className="h-4 w-4" />, color: 'text-orange-500' },
  text: { label: 'Text/SMS', icon: <MessageSquare className="h-4 w-4" />, color: 'text-cyan-500' },
  linkedin: { label: 'LinkedIn', icon: <MessageSquare className="h-4 w-4" />, color: 'text-blue-600' },
  other: { label: 'Other', icon: <MessageSquare className="h-4 w-4" />, color: 'text-gray-500' },
};

const OUTCOME_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  positive: { label: 'Positive', variant: 'default' },
  neutral: { label: 'Neutral', variant: 'secondary' },
  negative: { label: 'Negative', variant: 'destructive' },
  follow_up_needed: { label: 'Follow-up Needed', variant: 'outline' },
  no_response: { label: 'No Response', variant: 'secondary' },
};

export default function MloCommunications() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');

  const { isMloManager, isLoading: isRoleLoading } = useMloRole();
  const { data: ownCommunications, isLoading: isOwnLoading } = useMloCommunications();
  const { data: allCommunications, isLoading: isAllLoading } = useAllMloCommunications();

  const communications = isMloManager ? allCommunications : ownCommunications;
  const isLoading = isRoleLoading || (isMloManager ? isAllLoading : isOwnLoading);

  const filteredCommunications = communications?.filter((comm) => {
    if (typeFilter !== 'all' && comm.communication_type !== typeFilter) return false;
    if (outcomeFilter !== 'all' && comm.outcome !== outcomeFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !comm.summary.toLowerCase().includes(search) &&
        !comm.subject?.toLowerCase().includes(search) &&
        !comm.detailed_notes?.toLowerCase().includes(search) &&
        !comm.contact?.first_name?.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    return true;
  });

  const CommunicationCard = ({ comm }: { comm: MloCommunication }) => {
    const typeConfig = TYPE_CONFIG[comm.communication_type];
    const outcomeConfig = comm.outcome ? OUTCOME_CONFIG[comm.outcome] : null;

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={cn(
              "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-muted",
              typeConfig.color
            )}>
              {typeConfig.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{typeConfig.label}</Badge>
                    {comm.direction === 'inbound' ? (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <ArrowDownLeft className="h-3 w-3" />
                        Inbound
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3" />
                        Outbound
                      </Badge>
                    )}
                    {outcomeConfig && (
                      <Badge variant={outcomeConfig.variant}>{outcomeConfig.label}</Badge>
                    )}
                  </div>
                  
                  {comm.subject && (
                    <h4 className="font-medium mt-1">{comm.subject}</h4>
                  )}
                </div>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {format(new Date(comm.created_at), 'dd MMM yyyy HH:mm')}
                </span>
              </div>

              <p className="text-sm mt-2">{comm.summary}</p>

              {comm.detailed_notes && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {comm.detailed_notes}
                </p>
              )}

              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                {comm.contact && (
                  <span>
                    With: {comm.contact.first_name} {comm.contact.last_name}
                  </span>
                )}
                {comm.duration_minutes && (
                  <span>{comm.duration_minutes} min</span>
                )}
                {comm.follow_up_date && !comm.follow_up_completed && (
                  <Badge variant="outline" className="text-orange-600">
                    Follow-up: {format(new Date(comm.follow_up_date), 'dd MMM')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Communications" 
        description="Track all your interactions with contacts"
        actions={
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Log Communication
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Log Communication</DialogTitle>
              </DialogHeader>
              <MloCommunicationForm onSuccess={() => setIsAddDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search communications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone_call">Phone Call</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="video_call">Video Call</SelectItem>
                <SelectItem value="text">Text/SMS</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outcomes</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
                <SelectItem value="follow_up_needed">Follow-up Needed</SelectItem>
                <SelectItem value="no_response">No Response</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Communications List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-full max-w-lg" />
                    <div className="flex gap-4">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !filteredCommunications?.length ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<MessageSquare />}
              title="No communications found"
              description={searchTerm || typeFilter !== 'all' || outcomeFilter !== 'all'
                ? "Try adjusting your filters to see more interactions."
                : "Log your first communication to start tracking your interactions."}
              action={!searchTerm && typeFilter === 'all' && outcomeFilter === 'all' ? {
                label: "Log Communication",
                onClick: () => setIsAddDialogOpen(true),
                icon: <Plus className="h-4 w-4" />,
              } : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCommunications.map(comm => (
            <CommunicationCard key={comm.id} comm={comm} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
