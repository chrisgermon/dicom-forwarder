import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const ThemeApplier = () => {
  const { user } = useAuth();
  
  useEffect(() => {
    const applyTheme = async () => {
      // For single-tenant app, get theme from app_config
      const { data: config } = await supabase
        .from('app_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!config) return;

      // Theme signature for change detection - currently using config directly

      const root = document.documentElement;

      // Store theme in localStorage for persistence
      if (config.use_custom_colors === true) {
        localStorage.setItem('company_theme', JSON.stringify({
          colors: {
            primary: config.primary_color,
            background: config.background_color,
            foreground: config.foreground_color,
          }
        }));
      } else {
        localStorage.removeItem('company_theme');
      }

      // Always reset to defaults first
      const keys = ["primary", "background", "foreground"];
      
      keys.forEach(key => {
        root.style.removeProperty(`--${key}`);
      });

      // Only apply custom colors if explicitly enabled
      if (config.use_custom_colors === true) {
        const colorMap = {
          primary: config.primary_color,
          background: config.background_color,
          foreground: config.foreground_color,
        };

        Object.entries(colorMap).forEach(([key, value]) => {
          if (value) {
            root.style.setProperty(`--${key}`, value);
          }
        });
      }
    };
    
    applyTheme();
  }, [user]);

  // Apply theme from localStorage immediately on mount (before company data loads)
  useEffect(() => {
    const storedTheme = localStorage.getItem('company_theme');
    if (storedTheme) {
      try {
        const { colors } = JSON.parse(storedTheme);
        const root = document.documentElement;
        
        Object.entries(colors).forEach(([key, value]) => {
          if (value) {
            root.style.setProperty(`--${key}`, value as string);
          }
        });
      } catch (error) {
        console.error('Error applying stored theme:', error);
      }
    }
  }, []);

  return null;
};
