"use client";

import { useEffect, useState } from "react";

export function useCountUp(target: number, durationMs = 1100, start = false): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const to = start ? target : 0;
    let raf: number;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * to));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, start]);

  return value;
}
