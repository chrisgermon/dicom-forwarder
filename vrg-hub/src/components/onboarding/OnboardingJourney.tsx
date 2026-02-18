import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, Clock, User, Users, Calendar, Trophy, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";

interface OnboardingTask {
  id: string;
  title: string;
  description: string | null;
  category: string;
  is_completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  sort_order: number;
}

interface OnboardingMilestone {
  id: string;
  milestone_type: string;
  title: string;
  scheduled_date: string | null;
  completed_at: string | null;
  status: string;
}

interface OnboardingJourneyData {
  id: string;
  start_date: string;
  target_completion_date: string | null;
  status: string;
  completion_percentage: number;
  manager: { full_name: string } | null;
  mentor: { full_name: string } | null;
  tasks: OnboardingTask[];
  milestones: OnboardingMilestone[];
}

const categoryLabels: Record<string, { label: string; icon: string; color: string }> = {
  day1: { label: "Day 1", icon: "🚀", color: "bg-green-100 text-green-800" },
  week1: { label: "Week 1", icon: "📋", color: "bg-blue-100 text-blue-800" },
  month1: { label: "Month 1", icon: "🎯", color: "bg-purple-100 text-purple-800" },
  month3: { label: "90 Days", icon: "🏆", color: "bg-amber-100 text-amber-800" },
  general: { label: "General", icon: "📌", color: "bg-gray-100 text-gray-800" },
};

export function OnboardingJourney() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: journey, isLoading } = useQuery({
    queryKey: ["onboarding-journey", user?.id],
    queryFn: async () => {
      const { data: journeyData, error: journeyError } = await supabase
        .from("onboarding_journeys")
        .select(`
          id,
          start_date,
          target_completion_date,
          status,
          completion_percentage,
          manager_id,
          mentor_id
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (journeyError) throw journeyError;
      if (!journeyData) return null;

      const [{ data: tasks }, { data: milestones }] = await Promise.all([
        supabase
          .from("onboarding_task_completions")
          .select("*")
          .eq("journey_id", journeyData.id)
          .order("sort_order"),
        supabase
          .from("onboarding_milestones")
          .select("*")
          .eq("journey_id", journeyData.id)
          .order("scheduled_date"),
      ]);

      return {
        ...journeyData,
        manager: null,
        mentor: null,
        tasks: tasks || [],
        milestones: milestones || [],
      } as OnboardingJourneyData;
    },
    enabled: !!user?.id,
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const { error } = await supabase
        .from("onboarding_task_completions")
        .update({
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? user?.id : null,
        })
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-journey"] });
      toast.success("Progress updated!");
    },
    onError: () => {
      toast.error("Failed to update task");
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-8 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!journey) {
    return null; // No active onboarding journey
  }

  const daysInRole = differenceInDays(new Date(), new Date(journey.start_date));
  const tasksByCategory = journey.tasks.reduce((acc, task) => {
    const cat = task.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(task);
    return acc;
  }, {} as Record<string, OnboardingTask[]>);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Your Onboarding Journey
            </CardTitle>
            <CardDescription>
              Day {daysInRole} of your first 90 days
            </CardDescription>
          </div>
          <Badge variant={journey.status === "completed" ? "default" : "secondary"}>
            {journey.completion_percentage}% Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={journey.completion_percentage} className="h-2" />

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Started {format(new Date(journey.start_date), "MMM d, yyyy")}</span>
          </div>
          {journey.manager && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Manager: {journey.manager.full_name}</span>
            </div>
          )}
          {journey.mentor && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Mentor: {journey.mentor.full_name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>
              {journey.tasks.filter((t) => t.is_completed).length}/{journey.tasks.length} tasks
            </span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {Object.entries(categoryLabels).map(([key, { label, icon }]) => {
              const catTasks = tasksByCategory[key] || [];
              if (catTasks.length === 0) return null;
              const completed = catTasks.filter((t) => t.is_completed).length;
              const progress = Math.round((completed / catTasks.length) * 100);

              return (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => setActiveTab("tasks")}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{icon}</span>
                    <div>
                      <p className="font-medium">{label}</p>
                      <p className="text-sm text-muted-foreground">
                        {completed}/{catTasks.length} completed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24">
                      <Progress value={progress} className="h-1.5" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-3 mt-4 max-h-80 overflow-y-auto">
            {Object.entries(tasksByCategory).map(([category, tasks]) => {
              const catConfig = categoryLabels[category];
              return (
              <div key={category} className="space-y-2">
                <Badge className={catConfig?.color || "bg-gray-100"}>
                  {catConfig?.icon} {catConfig?.label || category}
                </Badge>
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                      task.is_completed ? "bg-muted/30 border-muted" : "bg-card border-border hover:border-primary/50"
                    }`}
                  >
                    <Checkbox
                      checked={task.is_completed}
                      onCheckedChange={(checked) =>
                        toggleTaskMutation.mutate({ taskId: task.id, completed: !!checked })
                      }
                      disabled={toggleTaskMutation.isPending}
                    />
                    <div className="flex-1">
                      <p className={`font-medium ${task.is_completed ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                      )}
                      {task.due_date && !task.is_completed && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Due: {format(new Date(task.due_date), "MMM d")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );})}
          </TabsContent>

          <TabsContent value="milestones" className="space-y-3 mt-4">
            {journey.milestones.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No milestones scheduled yet</p>
            ) : (
              journey.milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border ${
                    milestone.status === "completed"
                      ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                      : "bg-card border-border"
                  }`}
                >
                  {milestone.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{milestone.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {milestone.milestone_type.replace("_", " ").replace("day", "Day ")}
                      {milestone.scheduled_date &&
                        ` - ${format(new Date(milestone.scheduled_date), "MMM d, yyyy")}`}
                    </p>
                  </div>
                  <Badge variant={milestone.status === "completed" ? "default" : "outline"}>
                    {milestone.status}
                  </Badge>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
