import { Badge } from '@/components/ui/badge';
import { 
  Zap,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import type { RequestStatus } from '@/types/request';

interface RequestStatusBadgeProps {
  status: RequestStatus;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

export function RequestStatusBadge({ status, showIcon = true, size = 'default' }: RequestStatusBadgeProps) {
  const getStatusConfig = (status: RequestStatus) => {
    const configs = {
      submitted: {
        label: 'Submitted',
        icon: Eye,
        className: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md hover:shadow-lg border border-blue-400/30',
      },
      in_progress: {
        label: 'In Progress',
        icon: Zap,
        className: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:shadow-lg border border-amber-400/30',
      },
      completed: {
        label: 'Complete',
        icon: CheckCircle2,
        className: 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md hover:shadow-lg border border-green-500/30',
      },
    };

    return configs[status] || configs.submitted;
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1 h-6',
    default: 'text-sm px-3 py-1 h-7',
    lg: 'text-base px-4 py-2 h-8'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    default: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <Badge
      className={`
        ${config.className}
        ${sizeClasses[size]}
        inline-flex items-center gap-1.5 rounded-full font-medium
        transition-all duration-200 hover:scale-[1.02] cursor-default
      `}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}