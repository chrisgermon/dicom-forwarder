import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function ReminderCalendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: reminders } = useQuery({
    queryKey: ['calendar-reminders', currentDate.getMonth(), currentDate.getFullYear()],
    queryFn: async () => {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .gte('reminder_date', startOfMonth.toISOString())
        .lte('reminder_date', endOfMonth.toISOString())
        .eq('is_active', true);

      if (error) throw error;
      return data;
    },
  });

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getRemindersForDate = (date: Date) => {
    return reminders?.filter(r => {
      const reminderDate = new Date(r.reminder_date);
      return (
        reminderDate.getDate() === date.getDate() &&
        reminderDate.getMonth() === date.getMonth() &&
        reminderDate.getFullYear() === date.getFullYear()
      );
    }) || [];
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
  const dayNamesFull = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm sm:text-base min-w-[140px] sm:min-w-[180px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-6 pt-0">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Day headers - short on mobile, full on desktop */}
          {dayNames.map((day, idx) => (
            <div key={day + idx} className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-1 sm:py-2">
              <span className="sm:hidden">{day}</span>
              <span className="hidden sm:inline">{dayNamesFull[idx]}</span>
            </div>
          ))}

          {/* Empty cells for days before month starts */}
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Calendar days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            date.setHours(0, 0, 0, 0);
            const dayReminders = getRemindersForDate(date);
            const isToday = date.getTime() === today.getTime();
            const isPast = date < today;

            return (
              <div
                key={day}
                className={cn(
                  "aspect-square border rounded-md sm:rounded-lg p-0.5 sm:p-1 cursor-pointer hover:bg-accent transition-colors",
                  isToday && "bg-primary/10 border-primary",
                  isPast && "bg-muted/50"
                )}
                onClick={() => {
                  if (dayReminders.length > 0) {
                    navigate(`/reminders/${dayReminders[0].id}`);
                  }
                }}
              >
                <div className="flex flex-col h-full">
                  <span className={cn(
                    "text-[10px] sm:text-sm font-medium",
                    isToday && "text-primary font-bold"
                  )}>
                    {day}
                  </span>
                  {dayReminders.length > 0 && (
                    <div className="flex-1 flex flex-col gap-0.5 mt-0.5">
                      {/* On mobile, just show dots. On desktop, show titles */}
                      <div className="sm:hidden flex gap-0.5 flex-wrap">
                        {dayReminders.slice(0, 3).map((reminder, idx) => {
                          const reminderDate = new Date(reminder.reminder_date);
                          const isExpired = reminderDate < today;
                          return (
                            <div
                              key={idx}
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                isExpired ? "bg-destructive" : "bg-primary"
                              )}
                            />
                          );
                        })}
                        {dayReminders.length > 3 && (
                          <span className="text-[8px] text-muted-foreground">+{dayReminders.length - 3}</span>
                        )}
                      </div>
                      <div className="hidden sm:flex sm:flex-col gap-0.5">
                        {dayReminders.slice(0, 2).map((reminder, idx) => {
                          const reminderDate = new Date(reminder.reminder_date);
                          const isExpired = reminderDate < today;
                          return (
                            <div
                              key={idx}
                              className={cn(
                                "text-[10px] px-1 py-0.5 rounded truncate",
                                isExpired ? "bg-destructive/80 text-destructive-foreground" : "bg-primary/80 text-primary-foreground"
                              )}
                              title={reminder.title}
                            >
                              {reminder.title}
                            </div>
                          );
                        })}
                        {dayReminders.length > 2 && (
                          <div className="text-[10px] text-muted-foreground px-1">
                            +{dayReminders.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
