import { useState } from "react";
import { useChecklists } from "@/hooks/useChecklists";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Circle, XCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { PageContainer } from "@/components/ui/page-container";

export default function DailyChecklist() {
  const { items, itemCompletions, completion, completeItem, completeAllInSlot, submitChecklist, isLoading } = useChecklists();
  const [notes, setNotes] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <PageContainer maxWidth="lg" className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </PageContainer>
    );
  }

  if (!items || items.length === 0) {
    return (
      <PageContainer maxWidth="lg" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>No Checklist Available</CardTitle>
            <CardDescription>
              There is no daily checklist configured for your location.
            </CardDescription>
          </CardHeader>
        </Card>
      </PageContainer>
    );
  }

  // Group items by time slot
  const groupedItems = items.reduce((acc, item) => {
    const slot = item.time_slot || "Other";
    if (!acc[slot]) acc[slot] = [];
    acc[slot].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  const getCurrentDayOfWeek = () => {
    return format(new Date(), "EEEE").toLowerCase();
  };

  const shouldShowItem = (item: typeof items[0]) => {
    if (!item.day_restriction || item.day_restriction.length === 0) return true;
    return item.day_restriction.includes(getCurrentDayOfWeek());
  };

  // Calculate completion stats - only count items visible today
  const visibleItems = items.filter(shouldShowItem);
  const totalTasks = visibleItems.length;
  const completedTasks = itemCompletions?.filter((ic) => ic.status === "completed").length || 0;
  const naTasks = itemCompletions?.filter((ic) => ic.status === "na").length || 0;
  const completionPercentage = totalTasks > 0 ? Math.round(((completedTasks + naTasks) / totalTasks) * 100) : 0;

  const getItemCompletion = (itemId: string) => {
    return itemCompletions?.find((ic) => ic.item_id === itemId);
  };

  const handleComplete = (itemId: string, status: "completed" | "na" | "skipped") => {
    completeItem.mutate({
      itemId,
      status,
      notes: notes[itemId],
    });
  };

  const handleCompleteAllInSlot = (slotItems: typeof items) => {
    const incompleteItemIds = slotItems
      .filter((item) => {
        const ic = getItemCompletion(item.id);
        return !ic || ic.status === "pending";
      })
      .map((item) => item.id);

    if (incompleteItemIds.length > 0) {
      completeAllInSlot.mutate(incompleteItemIds);
    }
  };

  const getStatusIcon = (itemId: string) => {
    const ic = getItemCompletion(itemId);
    if (!ic || ic.status === "pending") return <Circle className="h-5 w-5 text-muted-foreground" />;
    if (ic.status === "completed") return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (ic.status === "na") return <XCircle className="h-5 w-5 text-gray-400" />;
    return <AlertCircle className="h-5 w-5 text-yellow-600" />;
  };

  const timeSlots = Object.keys(groupedItems).sort((a, b) => {
    const timeA = a.toLowerCase().replace(/[^0-9]/g, "");
    const timeB = b.toLowerCase().replace(/[^0-9]/g, "");
    return parseInt(timeA || "0") - parseInt(timeB || "0");
  });

  const isFullyCompleted = completionPercentage === 100;
  const isAlreadySubmitted = completion?.status === "completed";

  return (
    <PageContainer maxWidth="lg" className="space-y-6">
      {isFullyCompleted && !isAlreadySubmitted && (
        <Button
          size="lg"
          onClick={() => submitChecklist.mutate()}
          disabled={submitChecklist.isPending}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle2 className="h-5 w-5 mr-2" />
          Submit Checklist
        </Button>
      )}
      {isAlreadySubmitted && (
        <Badge variant="default" className="py-2 px-4 text-base bg-green-600">
          <CheckCircle2 className="h-5 w-5 mr-2" />
          Submitted
        </Badge>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Progress</span>
            <span className="text-2xl">{completionPercentage}%</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-muted rounded-full h-4">
            <div
              className="bg-primary h-4 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>{completedTasks + naTasks} completed</span>
            <span>{totalTasks} total tasks</span>
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={timeSlots} className="space-y-4">
        {timeSlots.map((timeSlot) => {
          const slotItems = groupedItems[timeSlot].filter(shouldShowItem);
          if (slotItems.length === 0) return null;

          const slotCompletions = slotItems.filter((item) => {
            const ic = getItemCompletion(item.id);
            return ic && (ic.status === "completed" || ic.status === "na");
          }).length;

          return (
            <AccordionItem key={timeSlot} value={timeSlot} className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5" />
                    <span className="font-semibold">{timeSlot}</span>
                    <Badge variant={slotCompletions === slotItems.length ? "default" : "secondary"}>
                      {slotCompletions}/{slotItems.length}
                    </Badge>
                  </div>
                  {slotCompletions < slotItems.length && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompleteAllInSlot(slotItems);
                      }}
                      disabled={completeAllInSlot.isPending}
                      className="ml-auto mr-2"
                    >
                      Mark All Complete
                    </Button>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3 pt-2">
                  {slotItems.map((item) => {
                    const ic = getItemCompletion(item.id);
                    const isCompleted = ic && (ic.status === "completed" || ic.status === "na");

                    return (
                      <Card key={item.id} className={isCompleted ? "bg-muted/30" : ""}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {getStatusIcon(item.id)}
                            <div className="flex-1">
                              <p className={`${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                                {item.task_description}
                              </p>
                              {ic?.initials && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Completed by {ic.initials} at{" "}
                                  {format(new Date(ic.completed_at!), "h:mm a")}
                                </p>
                              )}
                              {!isCompleted && (
                                <div className="mt-3 space-y-2">
                                  <Textarea
                                    placeholder="Add notes (optional)"
                                    value={notes[item.id] || ""}
                                    onChange={(e) => setNotes({ ...notes, [item.id]: e.target.value })}
                                    className="min-h-[60px]"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleComplete(item.id, "completed")}
                                      disabled={completeItem.isPending}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                      Complete
                                    </Button>
                                    {item.allow_na && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleComplete(item.id, "na")}
                                        disabled={completeItem.isPending}
                                      >
                                        N/A
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                              {ic?.notes && (
                                <p className="text-sm text-muted-foreground mt-2 italic">Note: {ic.notes}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </PageContainer>
  );
}
