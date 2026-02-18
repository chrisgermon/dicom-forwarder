import { useState } from 'react';
import { Plus, UserPlus, Calendar, Settings, X, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useTeams, useCreateTeam, useUpdateTeam, useDeleteTeam, useAddTeamMember, useRemoveTeamMember, useActiveUsers } from '@/hooks/useTicketingSystem';

export function TeamManagement() {
  const { data: teams, isLoading } = useTeams();

  if (isLoading) return <div>Loading teams...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Team Management</h3>
          <p className="text-sm text-muted-foreground">Manage teams and their members</p>
        </div>
        <TeamDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {teams?.map((team) => (
          <Card key={team.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{team.name}</CardTitle>
                  {team.description && (
                    <CardDescription className="mt-1">{team.description}</CardDescription>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={team.is_active ? 'default' : 'secondary'}>
                    {team.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <EditTeamDialog team={team} />
                  <DeleteTeamDialog teamId={team.id} teamName={team.name} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Team Members</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{team.team_members?.length || 0}</Badge>
                    <AddMemberDialog teamId={team.id} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  {team.team_members?.map((member: any) => (
                    <TeamMemberRow key={member.id} member={member} />
                  ))}
                </div>

                {(!team.team_members || team.team_members.length === 0) && (
                  <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                    No team members yet. Click the + button to add members.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!teams || teams.length === 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Settings className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No teams yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your first team to start managing assignments
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TeamMemberRow({ member }: { member: any }) {
  const removeMember = useRemoveTeamMember();
  
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {member.user?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="text-sm font-medium">{member.user?.full_name || 'Unknown'}</div>
          <div className="text-xs text-muted-foreground">{member.user?.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={member.role_in_team === 'lead' ? 'default' : 'outline'} className="text-xs">
          {member.role_in_team}
        </Badge>
        {member.out_of_office_from && member.out_of_office_to && (
          <Badge variant="secondary" className="text-xs">
            <Calendar className="mr-1 h-3 w-3" />
            OOO
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeMember.mutate(member.id)}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function AddMemberDialog({ teamId }: { teamId: string }) {
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [roleInTeam, setRoleInTeam] = useState('member');
  const { data: users } = useActiveUsers();
  const addMember = useAddTeamMember();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    await addMember.mutateAsync({
      team_id: teamId,
      user_id: selectedUser,
      role_in_team: roleInTeam,
    });
    setOpen(false);
    setSelectedUser('');
    setRoleInTeam('member');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <UserPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="user">Select User</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser} required>
              <SelectTrigger>
                <SelectValue placeholder="Choose a user" />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={roleInTeam} onValueChange={setRoleInTeam}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={!selectedUser}>
            Add Member
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TeamDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const createTeam = useCreateTeam();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTeam.mutateAsync({ name, description, is_active: isActive });
    setOpen(false);
    setName('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Team
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="team-name">Team Name</Label>
            <Input id="team-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="team-description">Description</Label>
            <Textarea id="team-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="team-active">Active</Label>
            <Switch id="team-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <Button type="submit" className="w-full">Create Team</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditTeamDialog({ team }: { team: any }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description || '');
  const [isActive, setIsActive] = useState(team.is_active);
  const updateTeam = useUpdateTeam();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTeam.mutateAsync({
      id: team.id,
      data: { name, description, is_active: isActive },
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-team-name">Team Name</Label>
            <Input id="edit-team-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="edit-team-description">Description</Label>
            <Textarea id="edit-team-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="edit-team-active">Active</Label>
            <Switch id="edit-team-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <Button type="submit" className="w-full">Update Team</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTeamDialog({ teamId, teamName }: { teamId: string; teamName: string }) {
  const deleteTeam = useDeleteTeam();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Team</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{teamName}"? This action cannot be undone and will remove all team members.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => deleteTeam.mutate(teamId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
