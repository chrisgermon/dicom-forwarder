import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface HeroSlide {
  type: "task" | "announcement";
  title: string;
  description: string;
  action?: { label: string; href: string };
  priority?: "high" | "medium" | "low";
}

interface DynamicHeroProps {
  title?: string;
  showTasks?: boolean;
  showAnnouncements?: boolean;
  autoAdvanceInterval?: number;
  config?: any;
}

export function DynamicHero({
  autoAdvanceInterval = 5000,
}: DynamicHeroProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides] = useState<HeroSlide[]>([]);

  useEffect(() => {
    if (slides.length <= 1 || !autoAdvanceInterval) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, autoAdvanceInterval);

    return () => clearInterval(interval);
  }, [slides.length, autoAdvanceInterval]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  if (slides.length === 0) {
    return (
      <Card className="w-full bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Dynamic hero is not available in single-tenant mode.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const currentSlideData = slides[currentSlide];

  return (
    <Card className="w-full bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="p-8 relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2">
              {currentSlideData.priority && (
                <span className="text-2xl">{getPriorityIcon(currentSlideData.priority)}</span>
              )}
              <h2 className="text-3xl font-bold text-primary">{currentSlideData.title}</h2>
            </div>
            
            <p className="text-lg text-muted-foreground max-w-2xl">
              {currentSlideData.description}
            </p>

            {currentSlideData.action && (
              <Button size="lg" asChild>
                <a href={currentSlideData.action.href}>{currentSlideData.action.label}</a>
              </Button>
            )}
          </div>

          {slides.length > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={prevSlide}
                className="rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex gap-1">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentSlide 
                        ? "w-8 bg-primary" 
                        : "w-2 bg-primary/30 hover:bg-primary/50"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={nextSlide}
                className="rounded-full"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getPriorityIcon(priority: "high" | "medium" | "low") {
  switch (priority) {
    case "high":
      return "🔴";
    case "medium":
      return "🟡";
    case "low":
      return "🟢";
  }
}