import { useState, useRef, useEffect } from "react";
import { Send, BarChart3, TrendingUp, Building2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "@/hooks/useAuditLog";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const suggestions = [
  { label: "2025 Revenue", icon: TrendingUp },
  { label: "YoY Comparison", icon: BarChart3 },
  { label: "Top Worksite", icon: Building2 },
  { label: "MSK X-rays", icon: Sparkles },
];

const AnalyticsAI = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { logAction } = useAuditLog();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatResponse = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n\n/g, '</p><p class="mt-2">')
      .replace(/\n/g, "<br>")
      .replace(
        /\|(.*?)\|/g,
        '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">$1</code>'
      );
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    setShowSuggestions(false);
    setInput("");
    setIsLoading(true);

    const userMessage: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMessage]);

    // Log the AI query
    logAction({ action: 'ACCESS', tableName: 'analytics_ai', metadata: { query: messageText } });

    try {
      const { data, error } = await supabase.functions.invoke('analytics-ai-proxy', {
        body: {
          message: messageText,
          history: messages,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e) {
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I couldn't connect to the server. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground mb-2">
                Analytics Assistant
              </h1>
              <p className="text-muted-foreground">
                Ask questions about invoices, studies, and performance
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 mb-6">
              <p className="font-medium text-foreground mb-3">I can help you with:</p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Invoice summaries and revenue reports
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Study volumes by modality or location
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Year-over-year comparisons
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Worksite performance analysis
                </li>
              </ul>
            </div>

            {showSuggestions && (
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion.label}
                    variant="outline"
                    size="sm"
                    onClick={() => sendMessage(suggestion.label)}
                    className="gap-2"
                  >
                    <suggestion.icon className="w-4 h-4" />
                    {suggestion.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "max-w-[85%] rounded-xl p-4",
                message.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-card border border-border"
              )}
            >
              {message.role === "assistant" ? (
                <div
                  className="text-foreground prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: formatResponse(message.content),
                  }}
                />
              ) : (
                message.content
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-1.5 p-4 bg-card border border-border rounded-xl w-fit">
              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-background p-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about revenue, studies, worksites..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={() => sendMessage()} disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsAI;
