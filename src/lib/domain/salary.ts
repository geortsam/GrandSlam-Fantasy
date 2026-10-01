// Dynamic player salaries, in millions, driven by ranking and recent form.

export const SALARY = {
  max: 30,
  min: 4,
  // How quickly price falls away from world No. 1.
  rankDecay: 28,
  // Each recent win above (or below) a .500 record moves price by this much.
  formStep: 0.5,
  formWindow: 10,
} as const;

export function formScore(recentForm: string): number {
  const window = recentForm.slice(0, SALARY.formWindow).toUpperCase();
  if (window.length === 0) return 0;
  const wins = [...window].filter((c) => c === "W").length;
  const losses = window.length - wins;
  return wins - losses;
}

/** Salary rounded to the nearest 0.5M and clamped to [min, max]. */
export function computeSalary(rank: number, recentForm: string): number {
  const safeRank = Math.max(1, rank);
  const base = SALARY.min + (SALARY.max - SALARY.min) * Math.exp(-(safeRank - 1) / SALARY.rankDecay);
  const adjusted = base + (formScore(recentForm) / 2) * SALARY.formStep;
  const clamped = Math.min(SALARY.max, Math.max(SALARY.min, adjusted));
  return Math.round(clamped * 2) / 2;
}
