import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, RefreshCw, MessageSquare, FileText, ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SharePointConfiguration } from "@/components/settings/SharePointConfiguration";
import { Office365UserSync } from "@/components/settings/Office365UserSync";
import { N8nIntegration } from "@/components/settings/N8nIntegration";
import { PipedreamIntegration } from "@/components/settings/PipedreamIntegration";
import { useAuth } from "@/hooks/useAuth";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

export default function Integrations() {
  const [testing, setTesting] = useState(false);
  const [notifyreStatus, setNotifyreStatus] = useState<"connected" | "disconnected" | "testing">("disconnected");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const { toast } = useToast();
  const { userRole } = useAuth();
  
  const isSuperAdmin = userRole === 'super_admin';

  useEffect(() => {
    checkNotifyreStatus();
    fetchLastSync();
  }, []);

  const checkNotifyreStatus = async () => {
    try {
      // Check if there are any fax campaigns
      const { data, error } = await supabase
        .from('notifyre_fax_campaigns')
        .select('id')
        .limit(1);

      if (!error && data && data.length > 0) {
        setNotifyreStatus("connected");
      } else {
        setNotifyreStatus("disconnected");
      }
    } catch (error) {
      console.error('Error checking Notifyre status:', error);
      setNotifyreStatus("disconnected");
    }
  };

  const fetchLastSync = async () => {
    try {
      const { data, error } = await supabase
        .from('notifyre_sync_history')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setLastSync(new Date(data.created_at).toLocaleString());
      }
    } catch (error) {
      console.error('Error fetching last sync:', error);
    }
  };

  const testNotifyreConnection = async () => {
    setTesting(true);
    setNotifyreStatus("testing");

    try {
      // Test by calling the sync function with a small date range
      const { error } = await supabase.functions.invoke('sync-notifyre-fax-logs', {
        body: {
          from_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          to_date: new Date().toISOString(),
          force_full_sync: false
        }
      });

      if (error) {
        throw error;
      }

      setNotifyreStatus("connected");
      toast({
        title: "Success",
        description: "Notifyre connection test successful",
      });
      
      await checkNotifyreStatus();
      await fetchLastSync();
    } catch (error: any) {
      console.error('Error testing Notifyre connection:', error);
      setNotifyreStatus("disconnected");
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Notifyre API",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const sendTestSms = async () => {
    if (!testPhone.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    if (!testMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    setSendingSms(true);

    try {
      const { error } = await supabase.functions.invoke('send-sms-reminder', {
        body: {
          phoneNumber: testPhone,
          message: testMessage,
          reminderId: 'test-sms'
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Test SMS sent successfully",
      });
      
      setTestPhone("");
      setTestMessage("");
    } catch (error: any) {
      console.error('Error sending test SMS:', error);
      toast({
        title: "Failed to Send SMS",
        description: error.message || "Failed to send test SMS via Notifyre",
        variant: "destructive",
      });
    } finally {
      setSendingSms(false);
    }
  };

  const getStatusBadge = () => {
    switch (notifyreStatus) {
      case "connected":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        );
      case "testing":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Testing...
          </Badge>
        );
      default:
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Not Connected
          </Badge>
        );
    }
  };

  return (
    <PageContainer maxWidth="xl" className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Manage third-party integrations and API keys"
      />

      <Alert>
        <AlertDescription>
          API keys are stored securely as backend secrets. To update an API key, you'll need to use the backend secrets manager.
        </AlertDescription>
      </Alert>

      {/* Notifyre Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Notifyre Fax API
                {getStatusBadge()}
              </CardTitle>
              <CardDescription>
                Integrate with Notifyre for fax campaign management
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                checkNotifyreStatus();
                fetchLastSync();
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastSync && (
            <div className="text-sm text-muted-foreground">
              Last synced: {lastSync}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label>API Key Configuration</Label>
              <p className="text-sm text-muted-foreground mt-1">
                API key is stored securely in backend secrets
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  toast({
                    title: "Update API Key",
                    description: "Please use the Lovable backend secrets manager to update NOTIFYRE_API_KEY.",
                  });
                }}
              >
                Update API Key
              </Button>
              <Button
                onClick={testNotifyreConnection}
                disabled={testing}
              >
                {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Test Connection
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Test SMS
            </h4>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="test-phone">Phone Number</Label>
                <Input
                  id="test-phone"
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-message">Message</Label>
                <Textarea
                  id="test-message"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Enter your test message"
                  rows={3}
                />
              </div>
              <Button
                onClick={sendTestSms}
                disabled={sendingSms || !testPhone.trim() || !testMessage.trim()}
                className="w-full"
              >
                {sendingSms && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send Test SMS
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2">Integration Details</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Provider:</span>
                <span className="font-medium text-foreground">Notifyre</span>
              </div>
              <div className="flex justify-between">
                <span>API Version:</span>
                <span className="font-medium text-foreground">v1</span>
              </div>
              <div className="flex justify-between">
                <span>Endpoint:</span>
                <span className="font-medium text-foreground">api.notifyre.com</span>
              </div>
              <div className="flex justify-between">
                <span>Features:</span>
                <span className="font-medium text-foreground">Fax Campaigns, SMS, Logs</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" asChild>
              <a href="/fax-campaigns" target="_blank" rel="noopener noreferrer">
                View Fax Campaigns
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* D2D - Document to DICOM Converter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Document to DICOM Converter
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                  Live
                </Badge>
              </CardTitle>
              <CardDescription>
                Convert PDF, JPG, and PNG documents to DICOM format and send to PACS
              </CardDescription>
            </div>
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              The D2D tool allows you to convert standard documents (PDFs, images) into DICOM format
              and send them directly to your PACS system. Perfect for importing external reports,
              scanned documents, and referral letters into the radiology workflow.
            </p>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2">Features</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                <span>Upload PDF, JPG, and PNG files</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                <span>Add patient metadata and study information</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                <span>Configure multiple DICOM destinations</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                <span>Test connectivity before sending</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                <span>Secure VNet integration with PACS</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2">Deployment Details</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Platform:</span>
                <span className="font-medium text-foreground">Azure Container Apps</span>
              </div>
              <div className="flex justify-between">
                <span>Location:</span>
                <span className="font-medium text-foreground">Australia Southeast</span>
              </div>
              <div className="flex justify-between">
                <span>Network:</span>
                <span className="font-medium text-foreground">VNet Integrated</span>
              </div>
              <div className="flex justify-between">
                <span>PACS Connectivity:</span>
                <span className="font-medium text-foreground">10.17.1.21:5000</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button asChild>
              <a href="/dicom-converter">
                Open D2D Converter
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href="https://d2d-app-vnet.kindglacier-71e74fc9.australiasoutheast.azurecontainerapps.io"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in New Window
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SharePoint Integration - Super Admin Only */}
      {isSuperAdmin && <SharePointConfiguration />}

      {/* Office 365 User Sync - Super Admin Only */}
      {isSuperAdmin && <Office365UserSync />}

      {/* Pipedream Cron Integration */}
      <PipedreamIntegration />

      {/* n8n Integration */}
      <N8nIntegration />

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-muted-foreground">Additional Integrations</CardTitle>
          <CardDescription>
            More integrations can be added here in the future
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Contact support to request new integrations or suggest third-party services you'd like to connect.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
