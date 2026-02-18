import { useState } from 'react';
import { Plus, ArrowUp, ArrowDown, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useRequestTypes, useRoutingRules, useTeams, useUpdateRoutingRule } from '@/hooks/useTicketingSystem';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const STRATEGY_LABELS = {
  default_assignee: 'Default Assignee',
  round_robin: 'Round Robin',
  load_balance: 'Load Balance',
  team_lead_first: 'Team Lead First',
  skill_based: 'Skill Based',
  fallback_to_department: 'Fallback to Department',
};

export function RoutingRulesManager() {
  const [selectedRequestType, setSelectedRequestType] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    strategy: 'default_assignee',
    team_id: '',
    priority: 1,
  });
  
  const { data: requestTypes } = useRequestTypes();
  const { data: routingRules } = useRoutingRules(selectedRequestType || undefined);
  const { data: teams } = useTeams();
  const updateRule = useUpdateRoutingRule();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleToggleActive = async (ruleId: string, isActive: boolean) => {
    await updateRule.mutateAsync({ id: ruleId, data: { is_active: !isActive } });
  };

  const handlePriorityChange = async (ruleId: string, direction: 'up' | 'down') => {
    const rule = routingRules?.find(r => r.id === ruleId);
    if (!rule) return;

    const newPriority = direction === 'up' ? rule.priority - 1 : rule.priority + 1;
    await updateRule.mutateAsync({ id: ruleId, data: { priority: newPriority } });
  };

  const handleCreateRule = async () => {
    if (!selectedRequestType) {
      toast({
        title: "Error",
        description: "Please select a request type first",
        variant: "destructive",
      });
      return;
    }

    if (!newRule.team_id) {
      toast({
        title: "Error",
        description: "Please select a team",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('routing_rules')
        .insert({
          request_type_id: selectedRequestType,
          team_id: newRule.team_id,
          strategy: newRule.strategy,
          priority: newRule.priority,
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Routing rule created successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['routing_rules'] });
      setIsAddDialogOpen(false);
      setNewRule({ strategy: 'default_assignee', team_id: '', priority: 1 });
    } catch (error) {
      console.error('Error creating routing rule:', error);
      toast({
        title: "Error",
        description: "Failed to create routing rule",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Routing Rules</h3>
          <p className="text-sm text-muted-foreground">Configure how requests are assigned to teams and users</p>
        </div>
        {selectedRequestType && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Routing Rule</DialogTitle>
                <DialogDescription>
                  Add a new rule to automatically route requests
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="team">Team</Label>
                  <Select value={newRule.team_id} onValueChange={(v) => setNewRule({ ...newRule, team_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams?.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="strategy">Strategy</Label>
                  <Select value={newRule.strategy} onValueChange={(v) => setNewRule({ ...newRule, strategy: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STRATEGY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="1"
                    value={newRule.priority}
                    onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRule}>
                  Create Rule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-4">
        <Select value={selectedRequestType || 'all'} onValueChange={(v) => setSelectedRequestType(v === 'all' ? null : v)}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select Request Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Request Types</SelectItem>
            {requestTypes?.map((rt) => (
              <SelectItem key={rt.id} value={rt.id}>
                {rt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedRequestType ? (
        <div className="space-y-4">
          {routingRules?.map((rule, index) => (
            <Card key={rule.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">
                        Priority {rule.priority}
                      </Badge>
                      <Badge>{STRATEGY_LABELS[rule.strategy as keyof typeof STRATEGY_LABELS]}</Badge>
                      <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="grid gap-2 text-sm">
                      {rule.default_assignee_user_id && (
                        <div>
                          <span className="text-muted-foreground">Default Assignee ID: </span>
                          <span className="font-medium font-mono text-xs">{rule.default_assignee_user_id}</span>
                        </div>
                      )}
                      {rule.team && (
                        <div>
                          <span className="text-muted-foreground">Team: </span>
                          <span className="font-medium">{rule.team.name}</span>
                        </div>
                      )}
                      {rule.skills && rule.skills.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Required Skills: </span>
                          <span className="font-medium">{rule.skills.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePriorityChange(rule.id, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePriorityChange(rule.id, 'down')}
                        disabled={index === (routingRules?.length || 0) - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => handleToggleActive(rule.id, rule.is_active)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {(!routingRules || routingRules.length === 0) && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Settings2 className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No routing rules configured</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Add routing rules to automatically assign requests
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              Select a request type to view and manage its routing rules
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
