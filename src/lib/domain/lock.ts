// Roster lockout: transfers and captain changes freeze at tournament start.

export function isLocked(startsAt: Date, now: Date = new Date()): boolean {
  return now.getTime() >= startsAt.getTime();
}

export interface Countdown {
  locked: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function countdown(startsAt: Date, now: Date = new Date()): Countdown {
  const ms = startsAt.getTime() - now.getTime();
  if (ms <= 0) return { locked: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const total = Math.floor(ms / 1000);
  return {
    locked: false,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}
