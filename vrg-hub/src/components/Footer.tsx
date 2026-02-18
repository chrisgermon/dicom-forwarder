import { useEffect, useState } from "react";
import crowdITLogo from "@/assets/crowdit-footer-logo.svg";

export function Footer() {
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="border-t bg-card py-4 sm:py-6 px-3 sm:px-6 mt-auto">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground text-center">
        <img 
          src={crowdITLogo} 
          alt="Crowd IT" 
          className="h-5 sm:h-6 object-contain opacity-70"
        />
        <span>
          © <span id="year">{year}</span> Crowd IT. System designed and developed by Crowd IT.
        </span>
      </div>
    </footer>
  );
}
