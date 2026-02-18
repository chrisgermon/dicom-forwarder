import { useState, useMemo } from "react";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, MapPin, Loader2, Upload } from "lucide-react";
import { BudgetImportDialog } from "@/components/mlo/BudgetImportDialog";
import { EditableTargetCell } from "@/components/mlo/EditableTargetCell";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, addMonths, addQuarters } from "date-fns";
import { toast } from "sonner";
import {
  useModalityTypes,
  useAllMloModalityTargets,
  useBulkUpsertMloModalityTargets,
  type MloModalityTargetInput,
} from "@/hooks/useMloModalityTargets";
import { useVersionedMloModalityTargetUpdate } from "@/hooks/useMloModalityTargetVersioning";
import { useAllMloAssignments } from "@/hooks/useMloData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRBAC } from "@/contexts/RBACContext";

type TargetPeriod = 'monthly' | 'quarterly';

export default function MloTargetsManager() {
  const [selectedMloId, setSelectedMloId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [periodType, setPeriodType] = useState<TargetPeriod>('monthly');
  const [periodOffset, setPeriodOffset] = useState(0); // 0 = current, 1 = next, etc.
  const [isSetTargetsDialogOpen, setIsSetTargetsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [targetInputs, setTargetInputs] = useState<Record<string, { referrals: number; scans: number }>>({});

  // Calculate period dates
  const now = new Date();
  const periodStart = useMemo(() => {
    if (periodType === 'monthly') {
      return format(startOfMonth(addMonths(now, periodOffset)), 'yyyy-MM-dd');
    }
    return format(startOfQuarter(addQuarters(now, periodOffset)), 'yyyy-MM-dd');
  }, [periodType, periodOffset]);

  const periodEnd = useMemo(() => {
    if (periodType === 'monthly') {
      return format(endOfMonth(addMonths(now, periodOffset)), 'yyyy-MM-dd');
    }
    return format(endOfQuarter(addQuarters(now, periodOffset)), 'yyyy-MM-dd');
  }, [periodType, periodOffset]);

  const periodLabel = useMemo(() => {
    const date = periodType === 'monthly' 
      ? addMonths(now, periodOffset) 
      : addQuarters(now, periodOffset);
    return periodType === 'monthly' 
      ? format(date, 'MMMM yyyy')
      : `Q${Math.floor(date.getMonth() / 3) + 1} ${format(date, 'yyyy')}`;
  }, [periodType, periodOffset]);

  // Check if user can edit targets
  const { hasAnyRole } = useRBAC();
  const canEditTargets = hasAnyRole(['super_admin', 'marketing_manager']);

  // Fetch data
  const { data: modalityTypes, isLoading: loadingModalities } = useModalityTypes();
  const { data: assignments, isLoading: loadingAssignments } = useAllMloAssignments();
  const { data: existingTargets, isLoading: loadingTargets } = useAllMloModalityTargets(
    selectedLocationId || undefined,
    periodStart,
    periodEnd
  );
  const bulkUpsert = useBulkUpsertMloModalityTargets();
  const versionedUpdate = useVersionedMloModalityTargetUpdate();

  // Fetch MLOs with marketing role
  const { data: mloUsers, isLoading: loadingMlos } = useQuery({
    queryKey: ['mlo-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rbac_user_roles')
        .select(`
          user_id,
          profiles!rbac_user_roles_user_id_fkey(id, full_name, email)
        `)
        .in('role_id', (
          await supabase
            .from('rbac_roles')
            .select('id')
            .in('name', ['marketing', 'marketing_manager'])
        ).data?.map(r => r.id) || []);

      if (error) throw error;
      
      // Deduplicate by user_id
      const uniqueUsers = new Map();
      data?.forEach(item => {
        if (item.profiles && !uniqueUsers.has(item.user_id)) {
          uniqueUsers.set(item.user_id, item.profiles);
        }
      });
      
      return Array.from(uniqueUsers.values()) as Array<{ id: string; full_name: string; email: string }>;
    },
  });

  // Get unique locations from assignments
  const locations = useMemo(() => {
    if (!assignments) return [];
    const uniqueLocations = new Map();
    assignments.forEach(a => {
      if (a.location && !uniqueLocations.has(a.location.id)) {
        uniqueLocations.set(a.location.id, a.location);
      }
    });
    return Array.from(uniqueLocations.values());
  }, [assignments]);

  // Filter targets based on selection
  const filteredTargets = useMemo(() => {
    if (!existingTargets) return [];
    return existingTargets.filter(t => {
      if (selectedMloId && t.user_id !== selectedMloId) return false;
      if (selectedLocationId && t.location_id !== selectedLocationId) return false;
      return true;
    });
  }, [existingTargets, selectedMloId, selectedLocationId]);

  // Open set targets dialog
  const openSetTargetsDialog = () => {
    if (!selectedMloId || !selectedLocationId) {
      toast.error('Please select an MLO and Location first');
      return;
    }

    // Pre-fill with existing values
    const inputs: Record<string, { referrals: number; scans: number }> = {};
    modalityTypes?.forEach(mod => {
      const existing = existingTargets?.find(
        t => t.user_id === selectedMloId && 
             t.location_id === selectedLocationId && 
             t.modality_type_id === mod.id
      );
      inputs[mod.id] = {
        referrals: existing?.target_referrals || 0,
        scans: existing?.target_scans || 0,
      };
    });
    setTargetInputs(inputs);
    setIsSetTargetsDialogOpen(true);
  };

  // Save targets
  const handleSaveTargets = async () => {
    if (!selectedMloId || !selectedLocationId || !modalityTypes) return;

    const targetsToUpsert: MloModalityTargetInput[] = modalityTypes
      .filter(mod => {
        const input = targetInputs[mod.id];
        return input && (input.referrals > 0 || input.scans > 0);
      })
      .map(mod => ({
        user_id: selectedMloId,
        location_id: selectedLocationId,
        modality_type_id: mod.id,
        target_period: periodType,
        period_start: periodStart,
        period_end: periodEnd,
        target_referrals: targetInputs[mod.id]?.referrals || 0,
        target_scans: targetInputs[mod.id]?.scans || 0,
      }));

    try {
      await bulkUpsert.mutateAsync(targetsToUpsert);
      toast.success('Targets saved successfully');
      setIsSetTargetsDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save targets');
    }
  };

  const isLoading = loadingModalities || loadingAssignments || loadingTargets || loadingMlos;

  return (
    <PageContainer>
      <PageHeader
        title="MLO Modality Targets"
        description="Set and manage referral/scan targets per MLO, worksite, and modality"
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>MLO</Label>
              <Select value={selectedMloId || "all"} onValueChange={(v) => setSelectedMloId(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All MLOs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All MLOs</SelectItem>
                  {mloUsers?.filter(user => user.id).map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Worksite</Label>
              <Select value={selectedLocationId || "all"} onValueChange={(v) => setSelectedLocationId(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Worksites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Worksites</SelectItem>
                  {locations.filter(loc => loc.id).map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Period Type</Label>
              <Tabs value={periodType} onValueChange={(v) => setPeriodType(v as TargetPeriod)}>
                <TabsList className="w-full">
                  <TabsTrigger value="monthly" className="flex-1">Monthly</TabsTrigger>
                  <TabsTrigger value="quarterly" className="flex-1">Quarterly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-2">
              <Label>Period</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPeriodOffset(p => p - 1)}
                >
                  ←
                </Button>
                <div className="flex-1 text-center font-medium">
                  {periodLabel}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPeriodOffset(p => p + 1)}
                >
                  →
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button 
              variant="outline"
              onClick={() => setIsImportDialogOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import Budget
            </Button>
            <Button 
              onClick={openSetTargetsDialog}
              disabled={!selectedMloId || !selectedLocationId}
            >
              <Plus className="mr-2 h-4 w-4" />
              Set Modality Targets
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Targets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Targets for {periodLabel}</CardTitle>
          <CardDescription>
            Showing {filteredTargets.length} modality targets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTargets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No targets set for this period. Select an MLO and worksite, then click "Set Modality Targets".
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MLO</TableHead>
                  <TableHead>Worksite</TableHead>
                  <TableHead>Modality</TableHead>
                  <TableHead className="text-right">Target Procedures</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTargets.map(target => (
                  <TableRow key={target.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {target.user?.full_name || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {target.location?.name || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {target.modality_type?.name || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <EditableTargetCell
                        value={target.target_scans}
                        canEdit={canEditTargets}
                        onSave={async (newValue) => {
                          await versionedUpdate.mutateAsync({
                            id: target.id,
                            target_scans: newValue,
                            // effective_date defaults to today, preserving historical data
                          });
                          toast.success('Target updated with versioning');
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Set Targets Dialog */}
      <Dialog open={isSetTargetsDialogOpen} onOpenChange={setIsSetTargetsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Set Modality Targets for {periodLabel}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2 text-sm text-muted-foreground mb-4">
              <div><strong>MLO:</strong> {mloUsers?.find(u => u.id === selectedMloId)?.full_name}</div>
              <div><strong>Worksite:</strong> {locations.find(l => l.id === selectedLocationId)?.name}</div>
            </div>

            <div className="grid gap-4">
              {modalityTypes?.map(modality => (
                <div key={modality.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="font-medium">{modality.name}</div>
                  <div className="space-y-1 w-32">
                    <Label className="text-xs">Target Procedures</Label>
                    <Input
                      type="number"
                      min="0"
                      value={targetInputs[modality.id]?.scans || 0}
                      onChange={(e) => setTargetInputs(prev => ({
                        ...prev,
                        [modality.id]: {
                          ...prev[modality.id],
                          scans: parseInt(e.target.value) || 0,
                          referrals: 0, // Always set referrals to 0
                        },
                      }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSetTargetsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTargets} disabled={bulkUpsert.isPending}>
              {bulkUpsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Targets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Budget Dialog */}
      <BudgetImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onSuccess={() => {
          // Refresh targets after import
        }}
      />
    </PageContainer>
  );
}
