import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Check, Users } from "lucide-react";
import { toast } from "sonner";

interface PollOption {
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  title: string;
  question_id: string;
  options: PollOption[];
  total_votes: number;
  user_vote: string | null;
  ends_at: string | null;
}

export function QuickPoll() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const { data: poll, isLoading } = useQuery({
    queryKey: ["quick-poll", user?.id],
    queryFn: async () => {
      // Get active polls
      const { data: surveys } = await supabase
        .from("surveys")
        .select(`
          id,
          title,
          ends_at,
          questions:survey_questions(id, question_text, options)
        `)
        .eq("survey_type", "poll")
        .eq("is_active", true)
        .lte("starts_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      if (!surveys || surveys.length === 0) return null;

      const survey = surveys[0];
      const question = survey.questions?.[0];
      if (!question) return null;

      // Check if user already voted
      const { data: existingResponse } = await supabase
        .from("survey_responses")
        .select(`
          id,
          answers:survey_answers(answer_choice)
        `)
        .eq("survey_id", survey.id)
        .eq("user_id", user?.id)
        .maybeSingle();

      // Get vote counts
      const { data: allResponses } = await supabase
        .from("survey_responses")
        .select(`
          answers:survey_answers(answer_choice)
        `)
        .eq("survey_id", survey.id)
        .eq("is_complete", true);

      const voteCounts: Record<string, number> = {};
      const options = (question.options as string[]) || [];
      options.forEach((opt) => (voteCounts[opt] = 0));

      allResponses?.forEach((r) => {
        const choice = r.answers?.[0]?.answer_choice;
        if (choice && voteCounts[choice] !== undefined) {
          voteCounts[choice]++;
        }
      });

      const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);

      return {
        id: survey.id,
        title: question.question_text || survey.title,
        question_id: question.id,
        options: options.map((text) => ({
          text,
          votes: voteCounts[text] || 0,
        })),
        total_votes: totalVotes,
        user_vote: existingResponse?.answers?.[0]?.answer_choice || null,
        ends_at: survey.ends_at,
      } as Poll;
    },
    enabled: !!user?.id,
  });

  const voteMutation = useMutation({
    mutationFn: async (choice: string) => {
      if (!poll) throw new Error("No poll");

      // Create response
      const { data: response, error: responseError } = await supabase
        .from("survey_responses")
        .insert({
          survey_id: poll.id,
          user_id: user?.id,
          is_complete: true,
        })
        .select()
        .single();

      if (responseError) throw responseError;

      // Submit answer
      const { error: answerError } = await supabase.from("survey_answers").insert({
        response_id: response.id,
        question_id: poll.question_id,
        answer_choice: choice,
      });

      if (answerError) throw answerError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-poll"] });
      toast.success("Vote recorded!");
      setSelectedOption(null);
    },
    onError: () => {
      toast.error("Failed to submit vote");
    },
  });

  if (isLoading || !poll) {
    return null;
  }

  const hasVoted = !!poll.user_vote;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Quick Poll
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {poll.total_votes} votes
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-medium">{poll.title}</p>

        <div className="space-y-2">
          {poll.options.map((option, idx) => {
            const percentage = poll.total_votes > 0 ? (option.votes / poll.total_votes) * 100 : 0;
            const isSelected = selectedOption === option.text || poll.user_vote === option.text;

            return (
              <div key={idx} className="relative">
                {hasVoted ? (
                  // Show results
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className={poll.user_vote === option.text ? "font-medium" : ""}>
                        {option.text}
                        {poll.user_vote === option.text && (
                          <Check className="h-3 w-3 inline ml-1 text-primary" />
                        )}
                      </span>
                      <span className="text-muted-foreground">{Math.round(percentage)}%</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                ) : (
                  // Show voting buttons
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedOption(option.text)}
                  >
                    {option.text}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {!hasVoted && selectedOption && (
          <Button
            className="w-full"
            onClick={() => voteMutation.mutate(selectedOption)}
            disabled={voteMutation.isPending}
          >
            Submit Vote
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
