import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AIContentSuggestionsProps {
  pageTitle: string;
  pageContent: string;
  onApplySuggestion: (suggestion: string) => void;
}

export function AIContentSuggestions({
  pageTitle,
  pageContent,
  onApplySuggestion,
}: AIContentSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const generateSuggestionsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-content-suggestions", {
        body: {
          title: pageTitle,
          content: pageContent,
        },
      });

      if (error) throw error;
      return data.suggestions as string[];
    },
    onSuccess: (data) => {
      setSuggestions(data);
      toast.success("AI suggestions generated!");
    },
    onError: (error) => {
      console.error("Error generating suggestions:", error);
      toast.error("Failed to generate suggestions");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Content Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          onClick={() => generateSuggestionsMutation.mutate()}
          disabled={generateSuggestionsMutation.isPending}
          variant="outline"
          className="w-full"
        >
          {generateSuggestionsMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Suggestions
            </>
          )}
        </Button>

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Suggested improvements:</p>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-3 border rounded-lg space-y-2 hover:border-primary transition-colors"
              >
                <p className="text-sm">{suggestion}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onApplySuggestion(suggestion)}
                >
                  Apply
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}