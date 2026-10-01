// Roster structure and salary-cap rules.
import type { SlotType, Tour, TourMode } from "./types";

export const ROSTER_SHAPE: Record<SlotType, number> = {
  STARTER: 4,
  CAPTAIN: 2,
  BENCH: 2,
};

export const ROSTER_SIZE = ROSTER_SHAPE.STARTER + ROSTER_SHAPE.CAPTAIN + ROSTER_SHAPE.BENCH;

export interface RosterPick {
  playerId: string;
  slot: SlotType;
}

export interface PlayerInfo {
  id: string;
  tour: Tour;
  salary: number;
  /** Whether the player is in this tournament's draw. */
  entered: boolean;
}

export interface RosterRules {
  /** Tours a roster may pick from: the league's tours that play this tournament. */
  allowedTours: Tour[];
  salaryCap: number;
}

/**
 * Tours that count for a league at a given tournament. A mixed league at a
 * single-tour event (e.g. Shanghai) plays that tour only; an empty result means
 * the tournament isn't eligible for the league.
 */
export function eligibleTours(tourMode: TourMode, tournamentTours: Tour[]): Tour[] {
  const leagueTours: Tour[] = tourMode === "MIXED" ? ["ATP", "WTA"] : [tourMode];
  return leagueTours.filter((t) => tournamentTours.includes(t));
}

export interface RosterValidation {
  ok: boolean;
  errors: string[];
  totalSalary: number;
}

/**
 * Validates a full 8-player roster: 4 starters, 2 captains and 2 bench, under
 * the cap. When both tours are allowed the scoring slots must be balanced:
 * 2 ATP and 2 WTA starters, and one captain from each tour.
 */
export function validateRoster(
  picks: RosterPick[],
  players: Map<string, PlayerInfo>,
  rules: RosterRules,
): RosterValidation {
  const errors: string[] = [];
  let totalSalary = 0;

  const ids = picks.map((p) => p.playerId);
  if (new Set(ids).size !== ids.length) errors.push("A player can only appear once on a roster.");
  if (picks.length !== ROSTER_SIZE) errors.push(`A roster needs exactly ${ROSTER_SIZE} players.`);

  for (const slot of Object.keys(ROSTER_SHAPE) as SlotType[]) {
    const count = picks.filter((p) => p.slot === slot).length;
    if (count !== ROSTER_SHAPE[slot]) {
      errors.push(`Pick ${ROSTER_SHAPE[slot]} ${slot.toLowerCase()} slot(s); you have ${count}.`);
    }
  }

  for (const pick of picks) {
    const player = players.get(pick.playerId);
    if (!player) {
      errors.push("One of the selected players does not exist.");
      continue;
    }
    totalSalary += player.salary;
    if (!player.entered) errors.push("Every player must be in this tournament's draw.");
    if (!rules.allowedTours.includes(player.tour)) {
      errors.push(`Only ${rules.allowedTours.join(" and ")} players count here.`);
    }
  }

  if (rules.allowedTours.length === 2) {
    const tourCount = (slot: SlotType, tour: Tour) =>
      picks.filter((p) => p.slot === slot && players.get(p.playerId)?.tour === tour).length;
    if (tourCount("STARTER", "ATP") !== 2 || tourCount("STARTER", "WTA") !== 2) {
      errors.push("Mixed rosters start 2 ATP and 2 WTA players.");
    }
    if (tourCount("CAPTAIN", "ATP") !== 1 || tourCount("CAPTAIN", "WTA") !== 1) {
      errors.push("Mixed rosters name one ATP captain and one WTA captain.");
    }
  }

  totalSalary = Math.round(totalSalary * 100) / 100;
  if (totalSalary > rules.salaryCap) {
    errors.push(`Roster costs $${totalSalary}M, over the $${rules.salaryCap}M cap.`);
  }

  return { ok: errors.length === 0, errors: [...new Set(errors)], totalSalary };
}
