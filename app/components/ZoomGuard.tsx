'use client';

import { useEffect } from 'react';

/**
 * iOS Safari ignores `user-scalable=no` for the pinch gesture, and it also
 * double-tap zooms on its own. Both are blocked here so the layout keeps its
 * full width while the user types or taps.
 */
export function ZoomGuard() {
  useEffect(() => {
    function blockGesture(event: Event) {
      event.preventDefault();
    }

    let lastTouchEnd = 0;
    function blockDoubleTap(event: TouchEvent) {
      const now = Date.now();
      if (now - lastTouchEnd <= 320) event.preventDefault();
      lastTouchEnd = now;
    }

    document.addEventListener('gesturestart', blockGesture, { passive: false });
    document.addEventListener('gesturechange', blockGesture, { passive: false });
    document.addEventListener('gestureend', blockGesture, { passive: false });
    document.addEventListener('touchend', blockDoubleTap, { passive: false });

    return () => {
      document.removeEventListener('gesturestart', blockGesture);
      document.removeEventListener('gesturechange', blockGesture);
      document.removeEventListener('gestureend', blockGesture);
      document.removeEventListener('touchend', blockDoubleTap);
    };
  }, []);

  return null;
}
