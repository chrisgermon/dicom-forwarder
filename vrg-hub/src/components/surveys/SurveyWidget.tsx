import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquare, Send, CheckCircle2, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface SurveyQuestion {
  id: string;
  question_text: string;
  question_type: "single_choice" | "multiple_choice" | "scale" | "text" | "rating";
  options: string[] | null;
  scale_min: number;
  scale_max: number;
  scale_labels: Record<string, string> | null;
  is_required: boolean;
  sort_order: number;
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
  survey_type: "pulse" | "poll" | "feedback" | "engagement";
  is_anonymous: boolean;
  ends_at: string | null;
  questions: SurveyQuestion[];
}

export function SurveyWidget() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  // Fetch active surveys that the user hasn't completed
  const { data: activeSurvey, isLoading } = useQuery({
    queryKey: ["active-survey", user?.id],
    queryFn: async () => {
      // Get surveys the user has already responded to
      const { data: completedSurveys } = await supabase
        .from("survey_responses")
        .select("survey_id")
        .eq("user_id", user?.id)
        .eq("is_complete", true);

      const completedIds = completedSurveys?.map((r) => r.survey_id) || [];

      // Get active surveys
      const { data: surveys, error } = await supabase
        .from("surveys")
        .select(`
          id,
          title,
          description,
          survey_type,
          is_anonymous,
          ends_at,
          questions:survey_questions(*)
        `)
        .eq("is_active", true)
        .lte("starts_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter to surveys not yet completed and not expired
      const available = surveys?.filter((s) => {
        if (completedIds.includes(s.id)) return false;
        if (s.ends_at && new Date(s.ends_at) < new Date()) return false;
        return true;
      });

      if (!available || available.length === 0) return null;

      // Sort questions by sort_order
      const survey = available[0];
      survey.questions = (survey.questions || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
      return survey as Survey;
    },
    enabled: !!user?.id,
  });

  const submitSurveyMutation = useMutation({
    mutationFn: async () => {
      if (!activeSurvey) return;

      // Create response
      const { data: response, error: responseError } = await supabase
        .from("survey_responses")
        .insert({
          survey_id: activeSurvey.id,
          user_id: activeSurvey.is_anonymous ? null : user?.id,
          anonymous_id: activeSurvey.is_anonymous ? crypto.randomUUID() : null,
          is_complete: true,
        })
        .select()
        .single();

      if (responseError) throw responseError;

      // Submit all answers
      const answerInserts = Object.entries(answers).map(([questionId, value]) => {
        const question = activeSurvey.questions.find((q) => q.id === questionId);
        return {
          response_id: response.id,
          question_id: questionId,
          answer_text: question?.question_type === "text" ? value : null,
          answer_choice: question?.question_type === "single_choice" ? value : null,
          answer_choices: question?.question_type === "multiple_choice" ? value : null,
          answer_scale: ["scale", "rating"].includes(question?.question_type || "") ? value : null,
        };
      });

      const { error: answersError } = await supabase.from("survey_answers").insert(answerInserts);
      if (answersError) throw answersError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-survey"] });
      toast.success("Thank you for your feedback!");
      setAnswers({});
      setCurrentQuestionIndex(0);
    },
    onError: () => {
      toast.error("Failed to submit survey");
    },
  });

  if (isLoading) {
    return null; // Don't show loading state for widget
  }

  if (!activeSurvey) {
    return null; // No active surveys
  }

  const currentQuestion = activeSurvey.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === activeSurvey.questions.length - 1;
  const progress = ((currentQuestionIndex + 1) / activeSurvey.questions.length) * 100;
  const currentAnswer = answers[currentQuestion?.id];

  const handleAnswer = (value: any) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleNext = () => {
    if (isLastQuestion) {
      submitSurveyMutation.mutate();
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
  };

  const renderQuestionInput = () => {
    switch (currentQuestion.question_type) {
      case "single_choice":
        return (
          <RadioGroup value={currentAnswer || ""} onValueChange={handleAnswer} className="space-y-2">
            {currentQuestion.options?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`option-${idx}`} />
                <Label htmlFor={`option-${idx}`} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "multiple_choice":
        return (
          <div className="space-y-2">
            {currentQuestion.options?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Checkbox
                  id={`option-${idx}`}
                  checked={(currentAnswer || []).includes(option)}
                  onCheckedChange={(checked) => {
                    const current = currentAnswer || [];
                    if (checked) {
                      handleAnswer([...current, option]);
                    } else {
                      handleAnswer(current.filter((o: string) => o !== option));
                    }
                  }}
                />
                <Label htmlFor={`option-${idx}`} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      case "scale":
      case "rating":
        const labels = currentQuestion.scale_labels || {};
        return (
          <div className="space-y-4">
            <Slider
              value={[currentAnswer || currentQuestion.scale_min]}
              onValueChange={([value]) => handleAnswer(value)}
              min={currentQuestion.scale_min}
              max={currentQuestion.scale_max}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{labels[String(currentQuestion.scale_min)] || currentQuestion.scale_min}</span>
              <span className="font-medium text-foreground">{currentAnswer || "-"}</span>
              <span>{labels[String(currentQuestion.scale_max)] || currentQuestion.scale_max}</span>
            </div>
          </div>
        );

      case "text":
        return (
          <Textarea
            value={currentAnswer || ""}
            onChange={(e) => handleAnswer(e.target.value)}
            placeholder="Type your response..."
            className="min-h-[100px]"
          />
        );

      default:
        return null;
    }
  };

  const surveyTypeConfig: Record<string, { icon: any; color: string }> = {
    pulse: { icon: MessageSquare, color: "bg-blue-100 text-blue-800" },
    poll: { icon: BarChart3, color: "bg-purple-100 text-purple-800" },
    feedback: { icon: MessageSquare, color: "bg-green-100 text-green-800" },
    engagement: { icon: CheckCircle2, color: "bg-amber-100 text-amber-800" },
  };

  const config = surveyTypeConfig[activeSurvey.survey_type] || surveyTypeConfig.feedback;
  const Icon = config.icon;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{activeSurvey.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {activeSurvey.is_anonymous && (
              <Badge variant="outline" className="text-xs">
                Anonymous
              </Badge>
            )}
            <Badge className={config.color}>{activeSurvey.survey_type}</Badge>
          </div>
        </div>
        {activeSurvey.description && <CardDescription>{activeSurvey.description}</CardDescription>}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              Question {currentQuestionIndex + 1} of {activeSurvey.questions.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Question */}
        <div className="space-y-4">
          <p className="font-medium">
            {currentQuestion.question_text}
            {currentQuestion.is_required && <span className="text-destructive ml-1">*</span>}
          </p>
          {renderQuestionInput()}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
          Previous
        </Button>
        <Button
          onClick={handleNext}
          disabled={
            (currentQuestion.is_required && !currentAnswer) || submitSurveyMutation.isPending
          }
        >
          {isLastQuestion ? (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit
            </>
          ) : (
            "Next"
          )}
        </Button>
      </CardFooter>

      {activeSurvey.ends_at && (
        <div className="px-6 pb-4 text-xs text-muted-foreground text-center">
          Ends {format(new Date(activeSurvey.ends_at), "MMM d, yyyy")}
        </div>
      )}
    </Card>
  );
}
