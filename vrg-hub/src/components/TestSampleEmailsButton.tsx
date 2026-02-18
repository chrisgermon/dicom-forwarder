import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function TestSampleEmailsButton() {
  const [loading, setLoading] = useState(false);

  const sendSampleEmails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sample-emails', {
        body: {}
      });

      if (error) throw error;

      toast.success('Sample emails sent successfully!', {
        description: 'Check chris@crowdit.com.au inbox for 3 sample emails: Toner Request, Hardware Approval, and User Invite.'
      });
      
      console.log('Sample emails sent:', data);
    } catch (error: any) {
      console.error('Failed to send sample emails:', error);
      toast.error('Failed to send sample emails', {
        description: error.message || 'Unknown error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={sendSampleEmails} 
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
          Send Sample Emails to Chris
        </>
      )}
    </Button>
  );
}
