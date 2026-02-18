import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Loader2, Webhook } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function N8nIntegration() {
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-webhook`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Webhook URL copied to clipboard",
    });
  };

  const testWebhook = async () => {
    setTesting(true);
    try {
      const { error } = await supabase.functions.invoke('n8n-webhook', {
        body: { action: 'test' }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "n8n webhook is working correctly",
      });
    } catch (error: any) {
      console.error('Error testing webhook:', error);
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test webhook",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          <div>
            <CardTitle>n8n Automation</CardTitle>
            <CardDescription>
              Connect your n8n workflows to automate Office 365, SharePoint, and other integrations
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Use this webhook URL in your n8n workflows to trigger automation actions.
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
              onClick={() => copyToClipboard(webhookUrl)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Add this URL as an HTTP Request node in n8n
          </p>
        </div>

        <div className="space-y-3 pt-4 border-t">
          <h4 className="font-semibold">Available Actions</h4>
          <div className="space-y-2 text-sm">
            <div className="bg-muted/50 p-3 rounded-md">
              <code className="text-xs">{"{ \"action\": \"test\" }"}</code>
              <p className="text-muted-foreground mt-1">Test the webhook connection</p>
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <code className="text-xs">{"{ \"action\": \"sync-office365-users\", \"company_id\": \"uuid\" }"}</code>
              <p className="text-muted-foreground mt-1">Sync Office 365 users</p>
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <code className="text-xs">{"{ \"action\": \"get-sharepoint-sites\", \"company_id\": \"uuid\" }"}</code>
              <p className="text-muted-foreground mt-1">Get SharePoint sites</p>
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <code className="text-xs">{"{ \"action\": \"browse-sharepoint-folder\", \"company_id\": \"uuid\", \"site_id\": \"...\", \"folder_path\": \"...\" }"}</code>
              <p className="text-muted-foreground mt-1">Browse SharePoint folder</p>
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <code className="text-xs">{"{ \"action\": \"sync-notifyre-fax\", \"from_date\": \"ISO date\", \"to_date\": \"ISO date\" }"}</code>
              <p className="text-muted-foreground mt-1">Sync Notifyre fax logs</p>
            </div>
          </div>
        </div>

        <Button
          onClick={testWebhook}
          disabled={testing}
          className="w-full"
        >
          {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Test Webhook
        </Button>

        <div className="pt-4 border-t">
          <h4 className="font-semibold mb-2">Setup in n8n</h4>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Create a new workflow in n8n</li>
            <li>Add an "HTTP Request" node</li>
            <li>Set method to POST</li>
            <li>Paste the webhook URL above</li>
            <li>Add the action JSON in the body</li>
            <li>Execute and automate!</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
