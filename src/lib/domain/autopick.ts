// Builds a random valid roster. Used by the seed and the "Auto-pick" button.
import { validateRoster, type PlayerInfo, type RosterPick } from "./roster";
import type { SlotType, Tour } from "./types";

export function autoPick(
  players: PlayerInfo[],
  allowedTours: Tour[],
  salaryCap: number,
  random: () => number = Math.random,
): RosterPick[] | null {
  const pool = players.filter((p) => p.entered && allowedTours.includes(p.tour));
  const byTour = (t: Tour) => pool.filter((p) => p.tour === t);
  const info = new Map(pool.map((p) => [p.id, p]));

  // Slots that need a specific tour when both tours are in play.
  const plan: Array<{ slot: SlotType; tour: Tour | null }> =
    allowedTours.length === 2
      ? [
          { slot: "CAPTAIN", tour: "ATP" },
          { slot: "CAPTAIN", tour: "WTA" },
          { slot: "STARTER", tour: "ATP" },
          { slot: "STARTER", tour: "ATP" },
          { slot: "STARTER", tour: "WTA" },
          { slot: "STARTER", tour: "WTA" },
          { slot: "BENCH", tour: null },
          { slot: "BENCH", tour: null },
        ]
      : [
          ...Array(2).fill({ slot: "CAPTAIN", tour: null }),
          ...Array(4).fill({ slot: "STARTER", tour: null }),
          ...Array(2).fill({ slot: "BENCH", tour: null }),
        ];

  const cheapest = pool.map((p) => p.salary).sort((a, b) => a - b);
  const floorFor = (n: number) => cheapest.slice(0, n).reduce((sum, x) => sum + x, 0);

  for (let attempt = 0; attempt < 300; attempt++) {
    const used = new Set<string>();
    const picks: RosterPick[] = [];
    let spent = 0;
    for (let i = 0; i < plan.length; i++) {
      const { slot, tour } = plan[i];
      const remaining = plan.length - i - 1;
      // Leave room for the cheapest possible remaining picks.
      const budget = salaryCap - spent - floorFor(remaining);
      const options = (tour ? byTour(tour) : pool).filter((p) => !used.has(p.id) && p.salary <= budget);
      if (options.length === 0) break;
      // Bias toward better players for captain slots.
      const sorted = [...options].sort((a, b) => b.salary - a.salary);
      const window = slot === "CAPTAIN" ? Math.min(6, sorted.length) : sorted.length;
      const choice = sorted[Math.floor(random() * window)];
      used.add(choice.id);
      spent += choice.salary;
      picks.push({ playerId: choice.id, slot });
    }
    if (picks.length === plan.length && validateRoster(picks, info, { allowedTours, salaryCap }).ok) {
      return picks;
    }
  }
  return null;
}
