"use client";

import { Lock, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { countdown } from "@/lib/domain/lock";

export function LockCountdown({ startsAt, onLock }: { startsAt: string; onLock?: () => void }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const c = countdown(new Date(startsAt), now ?? new Date(0));
  useEffect(() => {
    if (now && c.locked) onLock?.();
  }, [now, c.locked, onLock]);

  if (!now) return <span className="text-sm text-muted-foreground">Checking lock…</span>;
  if (c.locked) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-negative">
        <Lock className="size-4" /> Locked: the tournament has started
      </span>
    );
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold" role="timer" aria-live="off">
      <Timer className="size-4 text-accent" />
      Locks in {c.days > 0 && `${c.days}d `}
      {pad(c.hours)}:{pad(c.minutes)}:{pad(c.seconds)}
    </span>
  );
}
