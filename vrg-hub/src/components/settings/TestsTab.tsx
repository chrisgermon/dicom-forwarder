import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TestSampleEmailsButton } from "@/components/TestSampleEmailsButton";
import { TestEmailButton } from "@/components/TestEmailButton";
import { Button } from "@/components/ui/button";
import { Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

function TestInvitationButton() {
  const [loading, setLoading] = useState(false);

  const sendTestInvitation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-test-invitation', {
        body: {}
      });

      if (error) throw error;

      toast.success('Test invitation sent!', {
        description: 'Check chris@crowdit.com.au inbox for the sample invitation email.'
      });
      
      console.log('Test invitation sent:', data);
    } catch (error: any) {
      console.error('Failed to send test invitation:', error);
      toast.error('Failed to send test invitation', {
        description: error.message || 'Unknown error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={sendTestInvitation} 
      disabled={loading}
      variant="outline"
      size="sm"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sending...
        </>
      ) : (
        <>
          <Mail className="mr-2 h-4 w-4" />
          Send Test Invitation
        </>
      )}
    </Button>
  );
}

export function TestsTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email System Tests</CardTitle>
          <CardDescription>
            Test various email functionalities to see how they look and work.
            All test emails are sent to chris@crowdit.com.au
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">User Invitation Email</h4>
                <p className="text-sm text-muted-foreground">
                  Test how user invitation emails look and work
                </p>
              </div>
              <TestInvitationButton />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Sample Request Emails</h4>
                <p className="text-sm text-muted-foreground">
                  Test toner request, hardware approval, and user invite emails
                </p>
              </div>
              <TestSampleEmailsButton />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Custom Test Email</h4>
                <p className="text-sm text-muted-foreground">
                  Send a test email to any address
                </p>
              </div>
              <TestEmailButton />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
