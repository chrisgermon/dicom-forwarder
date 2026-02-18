import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarDays, Plus, Trash2, MapPin, Clock, Loader2 } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface UpcomingEvent {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
}

export function UpcomingEventsCard() {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    event_date: "",
    event_time: "",
    location: "",
  });

  const isAdmin = userRole === "super_admin" || userRole === "tenant_admin";

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["upcoming-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("upcoming_events")
        .select("*")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(5);

      if (error) throw error;
      return data as UpcomingEvent[];
    },
  });

  const addEvent = useMutation({
    mutationFn: async () => {
      const eventDateTime = new Date(`${newEvent.event_date}T${newEvent.event_time || "00:00"}`);
      const { error } = await supabase.from("upcoming_events").insert({
        title: newEvent.title,
        event_date: eventDateTime.toISOString(),
        location: newEvent.location || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
      setNewEvent({ title: "", event_date: "", event_time: "", location: "" });
      setDialogOpen(false);
      toast.success("Event added");
    },
    onError: () => {
      toast.error("Failed to add event");
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("upcoming_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
      toast.success("Event deleted");
    },
    onError: () => {
      toast.error("Failed to delete event");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.event_date) {
      toast.error("Title and date are required");
      return;
    }
    addEvent.mutate();
  };

  return (
    <Card variant="glass" className="h-full bg-card dark:bg-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" strokeWidth={1.5} />
            Upcoming Events
          </CardTitle>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Event</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      placeholder="Event title"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newEvent.event_date}
                        onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={newEvent.event_time}
                        onChange={(e) => setNewEvent({ ...newEvent, event_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      placeholder="Event location (optional)"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={addEvent.isPending}>
                    {addEvent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Event
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const eventDate = new Date(event.event_date);
              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-2 -mx-1 rounded-lg hover:bg-muted/60 transition-colors duration-100 group"
                >
                  <div className="flex flex-col items-center justify-center bg-primary/10 text-primary rounded-lg px-2 py-1.5 min-w-[50px]">
                    <span className="text-xs font-medium uppercase">
                      {format(eventDate, "EEE")}
                    </span>
                    <span className="text-sm font-bold">{format(eventDate, "d")}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{event.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(eventDate, "MMM d, h:mm a")}
                      </span>
                      {event.location && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteEvent.mutate(event.id)}
                      disabled={deleteEvent.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
