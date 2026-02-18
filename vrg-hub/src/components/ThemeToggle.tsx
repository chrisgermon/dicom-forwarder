import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const initialTheme = savedTheme || 'light';
    
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setTheme('dark');
    } else {
      document.documentElement.classList.remove('dark');
      setTheme('light');
    }
  }, []);

  const toggleTheme = async () => {
    setIsAnimating(true);
    const newTheme = theme === 'light' ? 'dark' : 'light';
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        "hover:bg-primary/10 dark:hover:bg-white/10",
        "hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)]",
        isAnimating && "scale-90"
      )}
    >
      <div className={cn(
        "transition-all duration-300",
        isAnimating && "rotate-180 scale-0"
      )}>
        {theme === 'light' ? (
          <Sun className="h-5 w-5 text-amber-500" />
        ) : (
          <Moon className="h-5 w-5 text-primary" />
        )}
      </div>
    </Button>
  );
}
