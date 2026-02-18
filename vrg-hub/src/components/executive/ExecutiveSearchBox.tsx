import { useState, useRef, useEffect } from "react";
import { Search, Loader2, Sparkles, X, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ResultDetailsDialog } from "./ResultDetailsDialog";

interface Message {
  role: "user" | "assistant";
  content: string;
  data?: any;
  timestamp: Date;
}

const EXAMPLE_QUERIES = [
  "Show me revenue for David Serich today",
  "Show me CT volumes from today for all sites",
  "What was total revenue last week?",
  "Top 5 radiologists by revenue this month",
];

interface ExecutiveSearchBoxProps {
  onSearch?: (query: string) => Promise<{ response: string; results?: any[] }>;
}

export function ExecutiveSearchBox({ onSearch }: ExecutiveSearchBoxProps) {
  const [query, setQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Click outside to collapse
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (messages.length === 0) {
          setIsExpanded(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [messages.length]);

  // Handle keyboard shortcut (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === "Escape" && isExpanded) {
        setIsExpanded(false);
        setQuery("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setCurrentQuery(query); // Store query for detail lookups
    setQuery("");
    setIsLoading(true);

    try {
      // Call the provided onSearch function or use default behavior
      if (onSearch) {
        const result = await onSearch(query);
        const assistantMessage: Message = {
          role: "assistant",
          content: result.response,
          data: result.results,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Fallback to showing a message if no search handler provided
        const assistantMessage: Message = {
          role: "assistant",
          content: "AI search is being configured. Please set up your Claude API key.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("AI Query error:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "I encountered an error processing your query. Please try rephrasing.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (exampleQuery: string) => {
    setQuery(exampleQuery);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setMessages([]);
    setQuery("");
    setIsExpanded(false);
  };

  const handleRowClick = (row: any) => {
    setSelectedResult(row);
    setDetailsOpen(true);
  };

  // Check if a field name indicates currency/money
  const isCurrencyField = (fieldName: string): boolean => {
    const lowerKey = fieldName.toLowerCase();
    return (
      lowerKey.includes("revenue") ||
      lowerKey.includes("amount") ||
      lowerKey.includes("total") ||
      lowerKey.includes("fee") ||
      lowerKey.includes("price") ||
      lowerKey.includes("cost") ||
      lowerKey.includes("payment")
    );
  };

  // Format currency value
  const formatCurrency = (value: number): string => {
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDataTable = (data: any[]) => {
    if (!data || data.length === 0) return null;

    const keys = Object.keys(data[0]);
    // Check if this is a detailed result that can be drilled down
    const hasDetailFields = keys.some((key) =>
      ["radiologistname", "worksitename", "radiologist", "worksite"].includes(
        key.toLowerCase()
      )
    );

    return (
      <div className="mt-3 overflow-x-auto">
        {hasDetailFields && (
          <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
            <MousePointerClick className="h-3 w-3" />
            <span>Click any row for detailed breakdown</span>
          </div>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {keys.map((key) => (
                <th key={key} className="text-left py-2 px-3 font-semibold text-xs uppercase">
                  {key.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 10).map((row, idx) => (
              <tr
                key={idx}
                onClick={hasDetailFields ? () => handleRowClick(row) : undefined}
                className={cn(
                  "border-b",
                  hasDetailFields
                    ? "hover:bg-accent/10 cursor-pointer transition-colors"
                    : ""
                )}
              >
                {keys.map((key) => (
                  <td key={key} className="py-2 px-3">
                    {typeof row[key] === "number" && isCurrencyField(key)
                      ? formatCurrency(row[key])
                      : typeof row[key] === "number"
                      ? Number(row[key]).toLocaleString()
                      : row[key] || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 10 && (
          <p className="text-xs text-muted-foreground mt-2">
            Showing 10 of {data.length} results
          </p>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="w-full max-w-3xl mx-auto mb-6">
      {/* Search Bar */}
      <div className="relative">
        <div
          className={cn(
            "flex items-center gap-2 bg-background border rounded-xl px-4 py-3 shadow-sm transition-all duration-200",
            isExpanded ? "border-primary shadow-md" : "border-border/50 hover:border-primary/40"
          )}
        >
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              placeholder="Ask about revenue, volumes, radiologists... (⌘K)"
              className="border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
            />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setQuery("")}
                className="h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </form>
          <Badge variant="secondary" className="text-xs shrink-0 gap-1">
            <Sparkles className="h-3 w-3" />
            AI
          </Badge>
        </div>

        {/* Expanded Results Panel */}
        {isExpanded && (
          <Card className="absolute top-full left-0 right-0 mt-2 shadow-xl border-primary/20 z-50 max-h-[600px] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
            <CardContent className="p-4 flex flex-col overflow-hidden flex-1">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-[200px] max-h-[500px]">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-8">
                    <Sparkles className="h-10 w-10 text-muted-foreground/50 mb-3" />
                    <h3 className="font-semibold text-sm mb-2">Ask me anything</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      I can help you analyze revenue, volumes, and performance metrics
                    </p>
                    <div className="space-y-1.5 w-full">
                      <p className="text-xs text-muted-foreground mb-2">Try these examples:</p>
                      {EXAMPLE_QUERIES.map((exampleQuery, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleExampleClick(exampleQuery)}
                          className="w-full text-left text-xs p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          {exampleQuery}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message, idx) => (
                      <div
                        key={idx}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg p-3 ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          {message.data && formatDataTable(message.data)}
                          <p className="text-xs opacity-70 mt-2">
                            {format(message.timestamp, "HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg p-3">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Clear Button */}
              {messages.length > 0 && (
                <div className="flex justify-end pt-2 border-t">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="text-xs"
                  >
                    Clear conversation
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Details Dialog */}
      <ResultDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        result={selectedResult}
        query={currentQuery}
      />
    </div>
  );
}
