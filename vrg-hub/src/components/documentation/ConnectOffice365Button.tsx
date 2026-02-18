import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ConnectOffice365Button() {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in again to connect Office 365');
        setConnecting(false);
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('office365-oauth-user-initiate', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      
      if (error) throw error;
      
      // Open OAuth flow in popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        data.authUrl,
        'office365-auth',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no,noopener=no,noreferrer=no`
      );
      popup?.focus();

      // Listen for successful connection
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'office365-connected') {
          toast.success('Office 365 connected successfully!');
          window.removeEventListener('message', handleMessage);
          setConnecting(false);
          // Reload to show SharePoint files
          window.location.reload();
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was closed without connecting
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setConnecting(false);
        }
      }, 500);
    } catch (error: any) {
      console.error('Error connecting Office 365:', error);
      toast.error('Failed to connect Office 365');
      setConnecting(false);
    }
  };

  return (
    <Button onClick={handleConnect} disabled={connecting}>
      {connecting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        'Connect Your Office 365 Account'
      )}
    </Button>
  );
}