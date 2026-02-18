import { useState } from "react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { Plus, Search, CheckCircle2, Circle, Clock, AlertTriangle, MoreHorizontal, Edit, Trash, Check, ListTodo } from "lucide-react";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMloTasks, useAllMloTasks, useUpdateMloTask, useDeleteMloTask, type MloTask } from "@/hooks/useMloCrm";
import { useMloRole } from "@/hooks/useMloRole";
import { MloTaskForm } from "@/components/mlo/MloTaskForm";
import { cn } from "@/lib/utils";

const TASK_TYPE_LABELS: Record<string, string> = {
  follow_up: 'Follow-up',
  meeting: 'Meeting',
  call: 'Call',
  email: 'Email',
  research: 'Research',
  presentation: 'Presentation',
  other: 'Other',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Circle className="h-4 w-4 text-muted-foreground" />,
  in_progress: <Clock className="h-4 w-4 text-blue-500" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  cancelled: <Circle className="h-4 w-4 text-muted-foreground line-through" />,
  deferred: <Clock className="h-4 w-4 text-yellow-500" />,
};

export default function MloTasks() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<MloTask | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const { isMloManager, isLoading: isRoleLoading } = useMloRole();
  const { data: ownTasks, isLoading: isOwnLoading } = useMloTasks();
  const { data: allTasks, isLoading: isAllLoading } = useAllMloTasks();
  const updateTask = useUpdateMloTask();
  const deleteTask = useDeleteMloTask();

  const tasks = isMloManager ? allTasks : ownTasks;
  const isLoading = isRoleLoading || (isMloManager ? isAllLoading : isOwnLoading);

  const getFilteredTasks = (statusOverride?: string) => {
    const filterStatus = statusOverride || statusFilter;
    return tasks?.filter((task) => {
      // Status filter
      if (filterStatus === 'active') {
        if (task.status === 'completed' || task.status === 'cancelled') return false;
      } else if (filterStatus !== 'all' && task.status !== filterStatus) {
        return false;
      }

      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (
          !task.title.toLowerCase().includes(search) &&
          !task.description?.toLowerCase().includes(search) &&
          !task.contact?.first_name?.toLowerCase().includes(search)
        ) {
          return false;
        }
      }
      return true;
    });
  };

  const filteredTasks = getFilteredTasks();
  const overdueTasks = filteredTasks?.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'completed' && t.status !== 'cancelled');
  const todayTasks = filteredTasks?.filter(t => t.due_date && isToday(new Date(t.due_date)));
  const upcomingTasks = filteredTasks?.filter(t => t.due_date && !isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));

  const handleComplete = async (task: MloTask) => {
    await updateTask.mutateAsync({ id: task.id, status: 'completed' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask.mutateAsync(id);
    }
  };

  const getDueDateBadge = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    
    if (isPast(date) && !isToday(date)) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    if (isToday(date)) {
      return <Badge variant="default">Today</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge variant="secondary">Tomorrow</Badge>;
    }
    return null;
  };

  const TaskCard = ({ task }: { task: MloTask }) => (
    <Card className={cn(
      "transition-all hover:shadow-md",
      task.status === 'completed' && "opacity-60"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1">
            <button 
              onClick={() => task.status !== 'completed' && handleComplete(task)}
              className="mt-1"
              disabled={task.status === 'completed'}
            >
              {STATUS_ICONS[task.status]}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={cn(
                  "font-medium",
                  task.status === 'completed' && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </h3>
                <Badge variant="outline" className={PRIORITY_COLORS[task.priority]}>
                  {task.priority}
                </Badge>
                <Badge variant="outline">{TASK_TYPE_LABELS[task.task_type]}</Badge>
                {getDueDateBadge(task.due_date)}
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                {task.due_date && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(task.due_date), 'dd MMM yyyy')}
                    {task.due_time && ` at ${task.due_time}`}
                  </span>
                )}
                {task.contact && (
                  <span>
                    Contact: {task.contact.first_name} {task.contact.last_name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {task.status !== 'completed' && (
                <DropdownMenuItem onClick={() => handleComplete(task)}>
                  <Check className="mr-2 h-4 w-4" />
                  Mark Complete
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setEditingTask(task)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDelete(task.id)}
                className="text-destructive"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <PageContainer>
      <PageHeader 
        title="Tasks" 
        description="Manage your follow-ups and to-dos"
        actions={
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <MloTaskForm onSuccess={() => setIsAddDialogOpen(false)} />
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
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-destructive">{overdueTasks?.length || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Due Today</p>
                <p className="text-2xl font-bold">{todayTasks?.length || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">{upcomingTasks?.length || 0}</p>
              </div>
              <Circle className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {tasks?.filter(t => t.status === 'completed').length || 0}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Task List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-4 w-4 rounded-full mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-full max-w-md" />
                    <div className="flex gap-4">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !filteredTasks?.length ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<ListTodo />}
              title="No tasks found"
              description={searchTerm || statusFilter !== 'active' || priorityFilter !== 'all'
                ? "Try adjusting your filters to see more tasks."
                : "Create your first task to start tracking your to-dos and follow-ups."}
              action={!searchTerm && statusFilter === 'active' && priorityFilter === 'all' ? {
                label: "Add Task",
                onClick: () => setIsAddDialogOpen(true),
                icon: <Plus className="h-4 w-4" />,
              } : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All ({filteredTasks.length})</TabsTrigger>
            <TabsTrigger value="overdue" className="text-destructive">
              Overdue ({overdueTasks?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="today">Today ({todayTasks?.length || 0})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({upcomingTasks?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            {filteredTasks.map(task => <TaskCard key={task.id} task={task} />)}
          </TabsContent>

          <TabsContent value="overdue" className="space-y-3">
            {overdueTasks?.map(task => <TaskCard key={task.id} task={task} />)}
          </TabsContent>

          <TabsContent value="today" className="space-y-3">
            {todayTasks?.map(task => <TaskCard key={task.id} task={task} />)}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-3">
            {upcomingTasks?.map(task => <TaskCard key={task.id} task={task} />)}
          </TabsContent>
        </Tabs>
      )}

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <MloTaskForm 
              task={editingTask} 
              onSuccess={() => setEditingTask(null)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
