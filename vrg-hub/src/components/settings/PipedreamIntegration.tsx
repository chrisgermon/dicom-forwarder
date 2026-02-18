import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Loader2, Clock, CheckCircle2, ExternalLink, Zap, Settings2, AlertCircle } from "lucide-react";

export function PipedreamIntegration() {
  const [testing, setTesting] = useState(false);
  const [testingAction, setTestingAction] = useState<string | null>(null);
  const [settingUp, setSettingUp] = useState(false);
  const [setupStatus, setSetupStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [setupResults, setSetupResults] = useState<any>(null);
  const { toast } = useToast();

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pipedream-cron`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const testAction = async (action: string) => {
    setTesting(true);
    setTestingAction(action);
    try {
      const { data, error } = await supabase.functions.invoke('pipedream-cron', {
        body: { action }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data?.message || `${action} triggered successfully`,
      });
    } catch (error: any) {
      console.error('Error testing action:', error);
      toast({
        title: "Test Failed",
        description: error.message || "Failed to trigger action",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
      setTestingAction(null);
    }
  };

  const setupWorkflows = async () => {
    setSettingUp(true);
    setSetupStatus('idle');
    setSetupResults(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('pipedream-setup', {
        body: { operation: 'setup' }
      });

      if (error) throw error;

      setSetupStatus('success');
      setSetupResults(data);
      
      const successCount = data?.results?.length || 0;
      const errorCount = data?.errors?.length || 0;
      
      toast({
        title: "Pipedream Setup Complete",
        description: `Created ${successCount} workflows${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
        variant: errorCount > 0 ? "default" : "default",
      });
    } catch (error: any) {
      console.error('Error setting up Pipedream:', error);
      setSetupStatus('error');
      
      const isAuthError = error.message?.includes('credentials') || error.message?.includes('OAuth');
      
      toast({
        title: "Setup Failed",
        description: isAuthError 
          ? "Pipedream OAuth credentials not configured. Please add them in backend secrets."
          : error.message || "Failed to set up Pipedream workflows",
        variant: "destructive",
      });
    } finally {
      setSettingUp(false);
    }
  };

  const exportConfigs = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('pipedream-setup', {
        body: { operation: 'export' }
      });

      if (error) throw error;

      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pipedream-workflows.json';
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Configs Exported",
        description: "Workflow configurations downloaded. Import them manually in Pipedream.",
      });
    } catch (error: any) {
      console.error('Error exporting configs:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export configurations",
        variant: "destructive",
      });
    }
  };

  const cronActions = [
    {
      action: "newsletter-reminders",
      description: "Send newsletter submission reminders based on due dates",
      schedule: "Daily at 9 AM Melbourne time",
      cron: "0 22 * * *"
    },
    {
      action: "process-scheduled-reports",
      description: "Process and send scheduled campaign reports",
      schedule: "Every 15 minutes",
      cron: "*/15 * * * *"
    },
    {
      action: "sync-campaigns",
      description: "Sync Mailchimp, Notifyre fax, and BigQuery referrers",
      schedule: "Every 6 hours",
      cron: "0 */6 * * *"
    },
    {
      action: "office365-sync",
      description: "Sync Office 365 users and mailboxes",
      schedule: "Daily at midnight Melbourne time",
      cron: "0 13 * * *"
    },
    {
      action: "check-reminders",
      description: "Check and send task reminders",
      schedule: "Every hour",
      cron: "0 * * * *"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <div>
              <CardTitle className="flex items-center gap-2">
                Pipedream Cron Jobs
                <Badge variant="outline" className="text-xs">Recommended</Badge>
              </CardTitle>
              <CardDescription>
                Schedule automated tasks using Pipedream workflows with cron triggers
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportConfigs}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Export Configs
            </Button>
            <Button
              size="sm"
              onClick={setupWorkflows}
              disabled={settingUp}
            >
              {settingUp ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Auto-Setup All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {setupStatus === 'success' && setupResults && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Setup Complete!</strong>
              <div className="mt-2 text-sm">
                <p>Created {setupResults.results?.length || 0} workflows:</p>
                <ul className="list-disc list-inside mt-1">
                  {setupResults.results?.map((r: any) => (
                    <li key={r.action}>{r.action} - {r.status}</li>
                  ))}
                </ul>
                {setupResults.errors?.length > 0 && (
                  <div className="mt-2 text-red-600">
                    <p>Errors:</p>
                    <ul className="list-disc list-inside">
                      {setupResults.errors.map((e: any, i: number) => (
                        <li key={i}>{e.action}: {e.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {setupStatus === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Setup Failed</strong>
              <p className="mt-1 text-sm">
                Make sure PIPEDREAM_CLIENT_ID and PIPEDREAM_CLIENT_SECRET are configured in backend secrets.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertDescription>
            <strong>Auto-Setup:</strong> Click "Auto-Setup All" to automatically create and activate all workflows in your Pipedream account using OAuth.
            <br />
            <strong>Manual Setup:</strong> Or export configs and import them manually.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label>Webhook URL</Label>
          <div className="flex gap-2">
            <Input
              value={webhookUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Authentication Header</Label>
          <div className="bg-muted/50 p-3 rounded-md">
            <code className="text-xs">x-cron-secret: [Your CRON_SECRET value]</code>
          </div>
          <p className="text-xs text-muted-foreground">
            Add this header to your Pipedream HTTP request for authentication
          </p>
        </div>

        <div className="space-y-3 pt-4 border-t">
          <h4 className="font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Available Cron Actions
          </h4>
          <div className="space-y-3">
            {cronActions.map((item) => (
              <div key={item.action} className="bg-muted/50 p-3 rounded-md space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-background px-2 py-1 rounded">
                        {`{ "action": "${item.action}" }`}
                      </code>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {item.schedule}
                      </Badge>
                      <code className="text-xs text-muted-foreground">{item.cron}</code>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testAction(item.action)}
                    disabled={testing}
                  >
                    {testing && testingAction === item.action ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Test"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-semibold mb-3">Manual Setup in Pipedream</h4>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Create a new workflow in Pipedream</li>
            <li>Add a <strong>Schedule</strong> trigger with the cron expression above</li>
            <li>Add an <strong>HTTP Request</strong> action</li>
            <li>Set method to <strong>POST</strong> and URL to the webhook URL</li>
            <li>Add header: <code className="bg-muted px-1 rounded">x-cron-secret</code> with your secret</li>
            <li>Set body to the JSON action payload</li>
            <li>Deploy the workflow</li>
          </ol>
          <Button variant="outline" className="mt-4" asChild>
            <a href="https://pipedream.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Pipedream
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
