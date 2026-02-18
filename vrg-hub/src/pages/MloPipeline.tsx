import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Plus, Search, DollarSign, TrendingUp, Target, MoreHorizontal, Edit, Trash, ArrowRight } from "lucide-react";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { useMloPipeline, useAllMloPipeline, useUpdateMloPipeline, useDeleteMloPipeline, type MloPipeline as MloPipelineType } from "@/hooks/useMloCrm";
import { useMloRole } from "@/hooks/useMloRole";
import { MloPipelineForm } from "@/components/mlo/MloPipelineForm";
import { cn } from "@/lib/utils";

const STAGE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  prospecting: { label: 'Prospecting', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  qualification: { label: 'Qualification', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  proposal: { label: 'Proposal', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  negotiation: { label: 'Negotiation', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  closed_won: { label: 'Won', color: 'text-green-700', bgColor: 'bg-green-100' },
  closed_lost: { label: 'Lost', color: 'text-red-700', bgColor: 'bg-red-100' },
};

const ACTIVE_STAGES = ['prospecting', 'qualification', 'proposal', 'negotiation'];

export default function MloPipeline() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<MloPipelineType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [_viewMode, _setViewMode] = useState<'kanban' | 'list'>('kanban');

  const { isMloManager, isLoading: isRoleLoading } = useMloRole();
  const { data: ownPipeline, isLoading: isOwnLoading } = useMloPipeline();
  const { data: allPipeline, isLoading: isAllLoading } = useAllMloPipeline();
  const updatePipeline = useUpdateMloPipeline();
  const deletePipeline = useDeleteMloPipeline();

  const pipeline = isMloManager ? allPipeline : ownPipeline;
  const isLoading = isRoleLoading || (isMloManager ? isAllLoading : isOwnLoading);

  const filteredPipeline = pipeline?.filter((opp) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !opp.opportunity_name.toLowerCase().includes(search) &&
        !opp.description?.toLowerCase().includes(search) &&
        !opp.contact?.first_name?.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    return true;
  });

  const pipelineByStage = useMemo(() => {
    const grouped: Record<string, MloPipelineType[]> = {};
    ACTIVE_STAGES.forEach(stage => { grouped[stage] = []; });
    
    filteredPipeline?.forEach(opp => {
      if (ACTIVE_STAGES.includes(opp.stage)) {
        grouped[opp.stage].push(opp);
      }
    });
    
    return grouped;
  }, [filteredPipeline]);

  const stats = useMemo(() => {
    const active = filteredPipeline?.filter(p => ACTIVE_STAGES.includes(p.stage)) || [];
    const totalValue = active.reduce((sum, p) => sum + (p.expected_revenue || 0), 0);
    const weightedValue = active.reduce((sum, p) => sum + ((p.expected_revenue || 0) * (p.probability || 0) / 100), 0);
    const avgProbability = active.length 
      ? Math.round(active.reduce((sum, p) => sum + (p.probability || 0), 0) / active.length)
      : 0;
    
    return { totalValue, weightedValue, avgProbability, count: active.length };
  }, [filteredPipeline]);

  const handleStageChange = async (opp: MloPipelineType, newStage: string) => {
    await updatePipeline.mutateAsync({ id: opp.id, stage: newStage as any });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this opportunity?')) {
      await deletePipeline.mutateAsync(id);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(value);
  };

  const OpportunityCard = ({ opp }: { opp: MloPipelineType }) => (
    <Card className="mb-3 cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">{opp.opportunity_name}</h4>
            {opp.contact && (
              <p className="text-sm text-muted-foreground">
                {opp.contact.first_name} {opp.contact.last_name}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditingOpportunity(opp)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {ACTIVE_STAGES.filter(s => s !== opp.stage).map(stage => (
                <DropdownMenuItem key={stage} onClick={() => handleStageChange(opp, stage)}>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Move to {STAGE_CONFIG[stage].label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleStageChange(opp, 'closed_won')} className="text-green-600">
                Mark as Won
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStageChange(opp, 'closed_lost')} className="text-red-600">
                Mark as Lost
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDelete(opp.id)} className="text-destructive">
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 space-y-2">
          {opp.expected_revenue && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Value</span>
              <span className="font-medium">{formatCurrency(opp.expected_revenue)}</span>
            </div>
          )}
          {opp.probability !== null && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Probability</span>
                <span>{opp.probability}%</span>
              </div>
              <Progress value={opp.probability} className="h-1.5" />
            </div>
          )}
          {opp.expected_close_date && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Close Date</span>
              <span>{format(new Date(opp.expected_close_date), 'dd MMM')}</span>
            </div>
          )}
          {opp.next_action && (
            <p className="text-xs text-muted-foreground bg-muted p-2 rounded mt-2">
              Next: {opp.next_action}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <PageContainer>
      <PageHeader 
        title="Pipeline" 
        description="Track your referral opportunities"
        actions={
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Opportunity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Opportunity</DialogTitle>
              </DialogHeader>
              <MloPipelineForm onSuccess={() => setIsAddDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Opportunities</p>
                <p className="text-2xl font-bold">{stats.count}</p>
              </div>
              <Target className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pipeline Value</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Weighted Value</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.weightedValue)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Probability</p>
                <p className="text-2xl font-bold">{stats.avgProbability}%</p>
              </div>
              <Progress value={stats.avgProbability} className="w-16 h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search opportunities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {ACTIVE_STAGES.map(stage => (
            <div key={stage} className="space-y-3">
              <div className={cn("p-3 rounded-lg", STAGE_CONFIG[stage].bgColor)}>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-6 rounded-full" />
                </div>
                <Skeleton className="h-3 w-16 mt-1" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                      <Skeleton className="h-3 w-24" />
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-1.5 w-full" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {ACTIVE_STAGES.map(stage => (
            <div key={stage} className="space-y-3">
              <div className={cn("p-3 rounded-lg", STAGE_CONFIG[stage].bgColor)}>
                <div className="flex items-center justify-between">
                  <h3 className={cn("font-medium", STAGE_CONFIG[stage].color)}>
                    {STAGE_CONFIG[stage].label}
                  </h3>
                  <Badge variant="secondary">{pipelineByStage[stage]?.length || 0}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatCurrency(pipelineByStage[stage]?.reduce((sum, p) => sum + (p.expected_revenue || 0), 0) || 0)}
                </p>
              </div>
              
              <div className="min-h-[200px]">
                {pipelineByStage[stage]?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                    No opportunities
                  </div>
                ) : (
                  pipelineByStage[stage]?.map(opp => (
                    <OpportunityCard key={opp.id} opp={opp} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingOpportunity} onOpenChange={(open) => !open && setEditingOpportunity(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Opportunity</DialogTitle>
          </DialogHeader>
          {editingOpportunity && (
            <MloPipelineForm 
              opportunity={editingOpportunity} 
              onSuccess={() => setEditingOpportunity(null)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
