"use client";

import { useEffect, useRef } from "react";

interface UseAutoScrollOptions {
  speed: number; // px per frame tick (0.5 - 5)
  isScrolling: boolean;
  onStop: () => void;
}

export function useAutoScroll({ speed, isScrolling, onStop }: UseAutoScrollOptions) {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // The frame loop lives inside the effect, so it always sees the current speed and stop.
  useEffect(() => {
    if (!isScrolling) return;
    lastTimeRef.current = 0;

    const step = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // ~60fps: 16.67ms per frame
      window.scrollBy(0, speed * (delta / 16.67));

      // Stop at bottom
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) {
        onStop();
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isScrolling, speed, onStop]);

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
