import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Sparkles, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface AIAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIAssistantDialog({ open, onOpenChange }: AIAssistantDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [requestUrl, setRequestUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!prompt.trim() || !user) return;

    setIsLoading(true);
    setResponse("");
    setRequestUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { prompt: prompt.trim() },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setResponse(data.response);
      
      if (data.requestUrl) {
        setRequestUrl(data.requestUrl);
      }
      
      if (data.action === "create_request") {
        toast({
          title: "✅ Request Created",
          description: "Your IT request has been submitted successfully.",
        });
      }
    } catch (error: any) {
      console.error("AI Assistant error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process your request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Assistant
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Textarea
              placeholder="How can I help you? For example: 'Create an IT request to fix the printer at Rochedale'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
              disabled={isLoading}
            />
          </div>

          {response && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm whitespace-pre-wrap">{response}</p>
              </div>
              {requestUrl && (
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => {
                    navigate(requestUrl);
                    onOpenChange(false);
                  }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Request
                </Button>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Close
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!prompt.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
