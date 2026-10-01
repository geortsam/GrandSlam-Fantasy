// League standings for tournament, season points and head-to-head formats.
import { slotMultiplier } from "./scoring";
import type { SlotType } from "./types";

export interface ScoredSlot {
  playerId: string;
  slot: SlotType;
}

/** Total fantasy points for a roster given each player's points in the tournament. */
export function rosterPoints(slots: ScoredSlot[], playerPoints: Map<string, number>): number {
  const total = slots.reduce(
    (sum, s) => sum + (playerPoints.get(s.playerId) ?? 0) * slotMultiplier(s.slot),
    0,
  );
  return Math.round(total * 100) / 100;
}

export interface Pairing {
  home: string;
  away: string | null; // null = bye
}

/**
 * Round-robin schedule (circle method). Week i of the season uses round
 * i mod rounds.length, so schedules repeat once every member has met.
 */
export function roundRobin(memberIds: string[]): Pairing[][] {
  if (memberIds.length < 2) return [];
  const teams: (string | null)[] = [...memberIds];
  if (teams.length % 2 === 1) teams.push(null);
  const n = teams.length;
  const rounds: Pairing[][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: Pairing[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = teams[i];
      const b = teams[n - 1 - i];
      if (a == null && b == null) continue;
      if (a == null) pairs.push({ home: b!, away: null });
      else if (b == null) pairs.push({ home: a, away: null });
      else pairs.push(r % 2 === 0 ? { home: a, away: b } : { home: b, away: a });
    }
    rounds.push(pairs);
    // Rotate every team except the first.
    teams.splice(1, 0, teams.pop()!);
  }
  return rounds;
}

export interface WeekResult {
  /** Points per member for one tournament ("week"). */
  points: Map<string, number>;
  /** Only completed weeks count toward the W-L record. */
  final: boolean;
}

export interface StandingRow {
  memberId: string;
  points: number;
  wins: number;
  losses: number;
  ties: number;
  /** Points from tournaments still in progress. */
  livePoints: number;
}

export function pointsStandings(memberIds: string[], weeks: WeekResult[]): StandingRow[] {
  const rows = memberIds.map((memberId) => {
    let points = 0;
    let livePoints = 0;
    for (const w of weeks) {
      const p = w.points.get(memberId) ?? 0;
      points += p;
      if (!w.final) livePoints += p;
    }
    return { memberId, points: round2(points), livePoints: round2(livePoints), wins: 0, losses: 0, ties: 0 };
  });
  return rows.sort((a, b) => b.points - a.points);
}

export function headToHeadStandings(memberIds: string[], weeks: WeekResult[]): StandingRow[] {
  const rows = new Map<string, StandingRow>(
    pointsStandings(memberIds, weeks).map((r) => [r.memberId, r]),
  );
  const schedule = roundRobin(memberIds);
  weeks.forEach((week, i) => {
    if (!week.final || schedule.length === 0) return;
    for (const { home, away } of schedule[i % schedule.length]) {
      if (away == null) continue;
      const h = week.points.get(home) ?? 0;
      const a = week.points.get(away) ?? 0;
      const hr = rows.get(home)!;
      const ar = rows.get(away)!;
      if (h > a) {
        hr.wins++;
        ar.losses++;
      } else if (a > h) {
        ar.wins++;
        hr.losses++;
      } else {
        hr.ties++;
        ar.ties++;
      }
    }
  });
  return [...rows.values()].sort(
    (x, y) => y.wins + y.ties / 2 - (x.wins + x.ties / 2) || y.points - x.points,
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
