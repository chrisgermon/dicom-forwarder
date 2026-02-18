import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Loader2, CheckCircle2, RefreshCw, Unplug, CloudDownload } from "lucide-react";
import { toast } from "sonner";
import { useHasOffice365Connection } from "@/hooks/useMloCalendarSync";

export function ConnectCalendarButton() {
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { data: isConnected, isLoading, refetch } = useHasOffice365Connection();

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in again to connect your calendar");
        setConnecting(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "office365-oauth-user-initiate",
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );

      if (error) throw error;

      // Open OAuth flow in popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        data.authUrl,
        "office365-calendar-auth",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no`
      );
      popup?.focus();

      // Listen for successful connection
      const handleMessage = async (event: MessageEvent) => {
        if (event.data.type === "office365-connected") {
          queryClient.setQueryData(["office365-connection-status"], true);
          window.removeEventListener("message", handleMessage);
          refetch();
          
          // Trigger initial sync to pull existing Outlook events
          toast.success("Calendar connected! Syncing existing events...");
          try {
            const { data: syncSession } = await supabase.auth.getSession();
            if (syncSession?.session) {
              const { data, error } = await supabase.functions.invoke("mlo-calendar-sync", {
                body: { action: "initial_sync" },
              });
              
              if (error) {
                console.error("Initial sync error:", error);
                toast.error("Connected, but failed to sync existing events");
              } else if (data?.success) {
                toast.success(`Synced ${data.importedEvents || 0} events from your Outlook calendar`);
              }
            }
          } catch (syncError) {
            console.error("Initial sync error:", syncError);
          }
          
          setConnecting(false);
        }
      };

      window.addEventListener("message", handleMessage);

      // Check if popup was closed without connecting
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", handleMessage);
          setConnecting(false);
          // Refetch to check if connection was actually made
          refetch();
        }
      }, 500);
    } catch (error: any) {
      console.error("Error connecting calendar:", error);
      toast.error("Failed to connect calendar");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in again");
        setDisconnecting(false);
        return;
      }

      // Delete the user's office365 connection
      const { error } = await supabase
        .from("office365_connections")
        .delete()
        .eq("user_id", session.user.id);

      if (error) throw error;

      toast.success("Calendar disconnected successfully");
      queryClient.setQueryData(["office365-connection-status"], false);
      refetch();
    } catch (error: any) {
      console.error("Error disconnecting calendar:", error);
      toast.error("Failed to disconnect calendar");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const { data: syncSession } = await supabase.auth.getSession();
      if (!syncSession?.session) {
        toast.error("Please sign in again to sync your calendar");
        setSyncing(false);
        return;
      }

      toast.info("Syncing calendar events...");
      const { data, error } = await supabase.functions.invoke("mlo-calendar-sync", {
        body: { action: "initial_sync" },
      });

      if (error) {
        console.error("Manual sync error:", error);
        toast.error("Failed to sync calendar events");
      } else if (data?.success) {
        toast.success(`Synced ${data.importedEvents || 0} events from your Outlook calendar`);
      }
    } catch (syncError) {
      console.error("Manual sync error:", syncError);
      toast.error("Failed to sync calendar events");
    } finally {
      setSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Checking...
      </Button>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" disabled>
          <CheckCircle2 className="mr-2 h-4 w-4 text-primary" />
          Calendar Connected
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleManualSync}
          disabled={syncing || connecting || disconnecting}
          title="Sync Outlook events"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CloudDownload className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleConnect}
          disabled={connecting || disconnecting || syncing}
          title="Reconnect calendar"
        >
          {connecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleDisconnect}
          disabled={disconnecting || connecting || syncing}
          title="Disconnect calendar"
        >
          {disconnecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Unplug className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" onClick={handleConnect} disabled={connecting}>
      {connecting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Calendar className="mr-2 h-4 w-4" />
          Connect to Your Calendar
        </>
      )}
    </Button>
  );
}

