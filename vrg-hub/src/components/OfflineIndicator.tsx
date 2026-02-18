/**
 * Offline status indicator component
 * Shows when user is offline and pending sync count
 */

import { WifiOff, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useOfflineCache } from '@/hooks/useOfflineCache';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount, syncOfflineQueue } = useOfflineCache();

  // Don't show anything if online and no pending items
  if (isOnline && pendingCount === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Pending sync indicator */}
        {pendingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 gap-1"
                onClick={() => syncOfflineQueue()}
                disabled={!isOnline || isSyncing}
              >
                <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
                <Badge variant="secondary" className="h-5 min-w-5 px-1">
                  {pendingCount}
                </Badge>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {isSyncing
                  ? 'Syncing changes...'
                  : `${pendingCount} pending change${pendingCount > 1 ? 's' : ''}`}
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Offline indicator */}
        {!isOnline && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-destructive/10 text-destructive">
                <WifiOff className="h-4 w-4" />
                <span className="text-xs font-medium">Offline</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>You're working offline. Changes will sync when you reconnect.</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
