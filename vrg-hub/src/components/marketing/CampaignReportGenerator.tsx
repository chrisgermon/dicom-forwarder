import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Mail, Loader2, Clock, CalendarIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { cn } from "@/lib/utils";

interface CampaignReportGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TimeframeOption = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

export const CampaignReportGenerator = ({ open, onOpenChange }: CampaignReportGeneratorProps) => {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [timeframe, setTimeframe] = useState<TimeframeOption>("this_week");
  const [isGenerating, setIsGenerating] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();

  // Fetch recent recipient emails for the logged-in user
  const { data: recentEmails, refetch } = useQuery({
    queryKey: ['recent-campaign-recipients'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('campaign_report_recipients')
        .select('email, last_used_at')
        .eq('user_id', user.id)
        .order('last_used_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching recent emails:', error);
        return [];
      }

      return data || [];
    },
    enabled: open,
  });

  const saveRecentEmail = async (email: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('campaign_report_recipients')
      .upsert(
        {
          user_id: user.id,
          email,
          last_used_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,email',
        }
      );
  };

  const handleGenerateReport = async () => {
    if (!recipientEmail) {
      toast.error("Please enter a recipient email address");
      return;
    }

    if (!recipientEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (timeframe === "custom" && (!customStartDate || !customEndDate)) {
      toast.error("Please select both start and end dates for custom range");
      return;
    }

    setIsGenerating(true);

    try {
      const body: any = { recipientEmail, timeframe };
      
      if (timeframe === "custom") {
        const tz = 'Australia/Melbourne';
        const startIso = fromZonedTime(`${format(customStartDate!, 'yyyy-MM-dd')} 00:00:00.000`, tz).toISOString();
        const endIso = fromZonedTime(`${format(customEndDate!, 'yyyy-MM-dd')} 23:59:59.999`, tz).toISOString();
        body.startDate = startIso;
        body.endDate = endIso;
      }

      const { data, error } = await supabase.functions.invoke('generate-campaign-report', {
        body,
      });

      if (error) {
        // Surface server validation errors (e.g., missing custom dates)
        // @ts-ignore - supabase error typing can vary
        toast.error(error?.message || 'Failed to generate report');
        throw error;
      }

      if (data?.success) {
        await saveRecentEmail(recipientEmail);
        await refetch();
        toast.success("Campaign report sent successfully!");
        setRecipientEmail("");
        setTimeframe("this_week");
        onOpenChange(false);
      } else {
        toast.error(data?.message || "Failed to generate report");
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error("Failed to generate and send report");
    } finally {
      setIsGenerating(false);
    }
  };

  const _getTimeframeLabel = (value: TimeframeOption) => { void _getTimeframeLabel;
    const labels: Record<TimeframeOption, string> = {
      this_week: "This Week",
      last_week: "Last Week",
      this_month: "This Month",
      last_month: "Last Month",
      custom: "Custom Range"
    };
    return labels[value];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Campaign Report
          </DialogTitle>
          <DialogDescription>
            Create a comprehensive report of email and fax campaigns for the selected timeframe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="timeframe">Timeframe</Label>
            <Select value={timeframe} onValueChange={(value) => setTimeframe(value as TimeframeOption)}>
              <SelectTrigger id="timeframe">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="last_week">Last Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="custom">Custom Date Range</SelectItem>
              </SelectContent>
            </Select>
        </div>

        {timeframe === "custom" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !customStartDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customStartDate ? format(customStartDate, "PPP") : "Pick start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customStartDate}
                    onSelect={setCustomStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !customEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customEndDate ? format(customEndDate, "PPP") : "Pick end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customEndDate}
                    onSelect={setCustomEndDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        <div className="space-y-2">
            <Label htmlFor="email">Recipient Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="recipient@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
            {recentEmails && recentEmails.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Recent recipients
                </Label>
                <div className="flex flex-wrap gap-2">
                  {recentEmails.map((item) => (
                    <Badge
                      key={item.email}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => setRecipientEmail(item.email)}
                    >
                      {item.email}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Report
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
