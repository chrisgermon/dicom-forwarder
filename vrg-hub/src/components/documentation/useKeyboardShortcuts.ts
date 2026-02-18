import { useEffect } from 'react';

interface KeyboardShortcutsOptions {
  onSearch?: () => void;
  onBack?: () => void;
  onRefresh?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onSearch,
  onBack,
  onRefresh,
  enabled = true,
}: KeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl/Cmd + F: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        onSearch?.();
      }

      // Backspace: Go back
      if (e.key === 'Backspace') {
        e.preventDefault();
        onBack?.();
      }

      // Ctrl/Cmd + R or F5: Refresh
      if (((e.ctrlKey || e.metaKey) && e.key === 'r') || e.key === 'F5') {
        e.preventDefault();
        onRefresh?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSearch, onBack, onRefresh, enabled]);
}
