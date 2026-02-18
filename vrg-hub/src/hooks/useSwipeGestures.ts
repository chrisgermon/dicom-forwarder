import { useEffect, useRef, useState } from "react";

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  enabled?: boolean;
}

interface SwipeState {
  swiping: boolean;
  direction: "left" | "right" | "up" | "down" | null;
  deltaX: number;
  deltaY: number;
}

export function useSwipeGestures<T extends HTMLElement = HTMLDivElement>(
  options: SwipeOptions = {}
) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    enabled = true,
  } = options;

  const ref = useRef<T>(null);
  const [swipeState, setSwipeState] = useState<SwipeState>({
    swiping: false,
    direction: null,
    deltaX: 0,
    deltaY: 0,
  });

  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      setSwipeState((prev) => ({ ...prev, swiping: true }));
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStart.current) return;

      const deltaX = e.touches[0].clientX - touchStart.current.x;
      const deltaY = e.touches[0].clientY - touchStart.current.y;

      let direction: SwipeState["direction"] = null;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? "right" : "left";
      } else {
        direction = deltaY > 0 ? "down" : "up";
      }

      setSwipeState({
        swiping: true,
        direction,
        deltaX,
        deltaY,
      });
    };

    const handleTouchEnd = () => {
      if (!touchStart.current) return;

      const { deltaX, deltaY, direction } = swipeState;

      if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
        switch (direction) {
          case "left":
            onSwipeLeft?.();
            break;
          case "right":
            onSwipeRight?.();
            break;
          case "up":
            onSwipeUp?.();
            break;
          case "down":
            onSwipeDown?.();
            break;
        }
      }

      touchStart.current = null;
      setSwipeState({
        swiping: false,
        direction: null,
        deltaX: 0,
        deltaY: 0,
      });
    };

    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: true });
    element.addEventListener("touchend", handleTouchEnd);

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, swipeState]);

  return { ref, swipeState };
}
