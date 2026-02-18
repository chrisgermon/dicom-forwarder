import { useEffect, useCallback, useState } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';

interface UseUnsavedChangesOptions {
  /** Whether there are unsaved changes */
  hasChanges: boolean;
  /** Custom message to show in the browser dialog */
  message?: string;
}

/**
 * Hook to warn users before leaving a page with unsaved changes.
 * Shows a browser confirmation dialog when navigating away or closing the tab.
 *
 * @example
 * ```tsx
 * const { isDirty, setIsDirty } = useUnsavedChanges({ hasChanges: form.formState.isDirty });
 * ```
 */
export function useUnsavedChanges({
  hasChanges,
  message = 'You have unsaved changes. Are you sure you want to leave?'
}: UseUnsavedChangesOptions) {
  const [shouldBlock, setShouldBlock] = useState(false);

  // Sync with external hasChanges state
  useEffect(() => {
    setShouldBlock(hasChanges);
  }, [hasChanges]);

  // Block browser close/refresh
  useBeforeUnload(
    useCallback(
      (event) => {
        if (shouldBlock) {
          event.preventDefault();
          // Modern browsers ignore custom messages but require returnValue
          event.returnValue = message;
          return message;
        }
      },
      [shouldBlock, message]
    )
  );

  // Block react-router navigation
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) => {
        return shouldBlock && currentLocation.pathname !== nextLocation.pathname;
      },
      [shouldBlock]
    )
  );

  // Reset blocker when user confirms
  const confirmNavigation = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  }, [blocker]);

  // Cancel navigation
  const cancelNavigation = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);

  return {
    /** Whether navigation is currently blocked */
    isBlocked: blocker.state === 'blocked',
    /** Confirm navigation when blocked */
    confirmNavigation,
    /** Cancel navigation and stay on page */
    cancelNavigation,
    /** Manually set whether to block navigation */
    setShouldBlock,
    /** Current blocking state */
    shouldBlock,
  };
}
