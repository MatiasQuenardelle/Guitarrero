"use client";

import { useRef, useCallback, useEffect } from "react";

interface UseAutoScrollOptions {
  speed: number; // px per frame tick (0.5 - 5)
  isScrolling: boolean;
  onStop: () => void;
}

export function useAutoScroll({ speed, isScrolling, onStop }: UseAutoScrollOptions) {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const scroll = useCallback(
    (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // ~60fps: 16.67ms per frame
      const px = speed * (delta / 16.67);
      window.scrollBy(0, px);

      // Stop at bottom
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) {
        onStop();
        return;
      }

      rafRef.current = requestAnimationFrame(scroll);
    },
    [speed, onStop]
  );

  useEffect(() => {
    if (isScrolling) {
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(scroll);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isScrolling, scroll]);

  // Pause on manual scroll
  useEffect(() => {
    if (!isScrolling) return;

    const handleWheel = () => {
      onStop();
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, [isScrolling, onStop]);
}
