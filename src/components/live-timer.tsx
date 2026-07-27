"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";

interface LiveTimerProps {
  startedAtIso: string;
  baseSeconds?: number;
  className?: string;
}

/**
 * Cronômetro client-side. Renderiza um placeholder estático no SSR e só calcula
 * o tempo real após montar no browser — evita mismatch de hidratação, já que
 * `Date.now()` no servidor e no client nunca batem no mesmo segundo.
 */
export function LiveTimer({ startedAtIso, baseSeconds = 0, className }: LiveTimerProps) {
  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => {
    const tick = () =>
      setElapsed(
        Math.floor((Date.now() - new Date(startedAtIso).getTime()) / 1000) + baseSeconds,
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAtIso, baseSeconds]);

  return (
    <span className={className} aria-live="off">
      {elapsed === null ? formatDuration(baseSeconds) : formatDuration(elapsed)}
    </span>
  );
}
