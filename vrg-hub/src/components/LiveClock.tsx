import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { formatAUDateTimeFull } from '@/lib/dateUtils';

export function LiveClock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground border-l pl-3">
      <Clock className="w-3.5 h-3.5" />
      <span className="font-medium whitespace-nowrap">
        {formatAUDateTimeFull(currentTime.toISOString())}
      </span>
    </div>
  );
}
