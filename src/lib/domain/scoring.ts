// Fantasy scoring engine for Grand Slam and Masters 1000 matches.

export const SCORING = {
  matchWon: 10,
  straightSetsBonus: 5,
  ace: 0.5,
  doubleFault: -0.5,
  breakPointConverted: 2,
  captainMultiplier: 1.5,
} as const;

/**
 * Upset bonus tiers for beating a higher seed. The tier is set by the seed of
 * the beaten opponent: the better the seed, the bigger the bonus.
 */
export const UPSET_TIERS: ReadonlyArray<{ maxSeed: number; bonus: number; label: string }> = [
  { maxSeed: 4, bonus: 10, label: "Top-4 seed upset" },
  { maxSeed: 8, bonus: 7, label: "Top-8 seed upset" },
  { maxSeed: 16, bonus: 5, label: "Top-16 seed upset" },
  { maxSeed: 32, bonus: 3, label: "Seeded upset" },
];

export interface MatchLine {
  won: boolean;
  /** True once the match has a final result. Win and upset points wait for this. */
  completed: boolean;
  /** Retirements and walkovers do not earn the straight-sets bonus. */
  completedByRetirement?: boolean;
  setsWon: number;
  setsLost: number;
  aces: number;
  doubleFaults: number;
  breakPointsConverted: number;
  seed: number | null;
  opponentSeed: number | null;
}

export interface PointsBreakdown {
  matchWon: number;
  straightSets: number;
  aces: number;
  doubleFaults: number;
  breakPoints: number;
  upset: number;
  total: number;
}

/** Bonus for beating an opponent with a better seed, or 0 when it isn't an upset. */
export function upsetBonus(seed: number | null, opponentSeed: number | null): number {
  if (opponentSeed == null) return 0;
  // An unseeded player beating any seed is an upset; between seeds, a lower number is better.
  const isUpset = seed == null || opponentSeed < seed;
  if (!isUpset) return 0;
  const tier = UPSET_TIERS.find((t) => opponentSeed <= t.maxSeed);
  return tier ? tier.bonus : 0;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Points for one player in one match. In-progress matches score their running
 * stats (aces, double faults, breaks) so leaderboards move live; win, straight
 * sets and upset bonuses land when the match completes.
 */
export function scoreMatch(line: MatchLine): PointsBreakdown {
  const winPoints = line.completed && line.won;
  const breakdown = {
    matchWon: winPoints ? SCORING.matchWon : 0,
    straightSets:
      winPoints && !line.completedByRetirement && line.setsLost === 0 && line.setsWon > 0
        ? SCORING.straightSetsBonus
        : 0,
    aces: round2(line.aces * SCORING.ace),
    doubleFaults: round2(line.doubleFaults * SCORING.doubleFault),
    breakPoints: line.breakPointsConverted * SCORING.breakPointConverted,
    upset: winPoints ? upsetBonus(line.seed, line.opponentSeed) : 0,
  };
  const total = round2(
    breakdown.matchWon +
      breakdown.straightSets +
      breakdown.aces +
      breakdown.doubleFaults +
      breakdown.breakPoints +
      breakdown.upset,
  );
  return { ...breakdown, total };
}

export function slotMultiplier(slot: "STARTER" | "CAPTAIN" | "BENCH"): number {
  if (slot === "CAPTAIN") return SCORING.captainMultiplier;
  if (slot === "STARTER") return 1;
  return 0;
}
