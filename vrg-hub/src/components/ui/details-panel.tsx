import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';
import { ScrollArea } from './scroll-area';
import { cn } from '@/lib/utils';

interface DetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg';
}

const widthClasses = {
  sm: 'w-80',
  md: 'w-96',
  lg: 'w-[32rem]',
};

export function DetailsPanel({
  isOpen,
  onClose,
  title,
  children,
  width = 'md',
}: DetailsPanelProps) {
  if (!isOpen) return null;

  return (
    <aside
      className={cn(
        'border-l bg-card transition-all duration-300 ease-in-out flex-shrink-0',
        widthClasses[width],
        'hidden lg:block'
      )}
    >
      <div className="sticky top-0 h-screen flex flex-col">
        <div className="flex items-center justify-between border-b px-6 py-4">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-6">{children}</div>
        </ScrollArea>
      </div>
    </aside>
  );
}

interface DetailsSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function DetailsSection({ title, children, className }: DetailsSectionProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

interface DetailsFieldProps {
  label: string;
  value: ReactNode;
}

export function DetailsField({ label, value }: DetailsFieldProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || '-'}</p>
    </div>
  );
}
