// Deterministic mock tennis provider. Every draw and match is simulated from a
// seeded RNG, then revealed against the clock: matches go SCHEDULED -> LIVE ->
// COMPLETED as real time passes, with running stats during play. That lets the
// whole app (sync, scoring, live leaderboards) run without an API key.
import type { Surface, Tour } from "@/lib/domain/types";
import { ATP_PLAYERS, CALENDAR_2026, WTA_PLAYERS, type SeedPlayer, type SeedTournament } from "./mock-data";
import type {
  ProviderEntry,
  ProviderMatch,
  ProviderMatchStat,
  ProviderPlayer,
  ProviderTournament,
  TennisDataProvider,
  TournamentStatus,
} from "./provider";

const DRAW_SIZE = 32;
const ROUNDS = 5;
const ROUND_NAMES = ["Round of 32", "Round of 16", "Quarterfinal", "Semifinal", "Final"];
// One seed per first-round match, with seeds 1 and 2 in opposite halves.
const SEED_POSITIONS = [0, 31, 16, 15, 8, 23, 24, 7, 4, 27, 12, 19, 20, 11, 28, 3];
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// --- seeded randomness -----------------------------------------------------

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededRandom(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Random count around a mean, at least 0. */
function around(rand: () => number, mean: number): number {
  return Math.max(0, Math.round(mean * (0.4 + rand() * 1.2)));
}

// --- players ---------------------------------------------------------------

interface BasePlayer extends Omit<ProviderPlayer, "seasonWins" | "seasonLosses" | "recentForm"> {
  serve: number; // 0.7-1.3 multiplier on aces
}

function buildPlayers(tour: Tour, list: SeedPlayer[]): BasePlayer[] {
  return list.map((p, i) => {
    const rank = i + 1;
    const rand = seededRandom(`${tour}:${p.name}`);
    const base = 0.8 - rank * 0.005;
    const surface = (key: "H" | "C" | "G") =>
      Math.min(0.93, Math.max(0.3, base + (p.specialty === key ? 0.07 : -0.03) + (rand() - 0.5) * 0.06));
    return {
      externalId: `${tour.toLowerCase()}-${slugify(p.name)}`,
      name: p.name,
      tour,
      country: p.country,
      rank,
      rankPoints: Math.round(10500 * Math.exp(-(rank - 1) / 11) + 700 - rank * 5),
      hardWinPct: round3(surface("H")),
      clayWinPct: round3(surface("C")),
      grassWinPct: round3(surface("G")),
      serve: 0.7 + rand() * 0.6 + (p.specialty === "G" ? 0.15 : 0),
    };
  });
}

const PLAYERS: Record<Tour, BasePlayer[]> = {
  ATP: buildPlayers("ATP", ATP_PLAYERS),
  WTA: buildPlayers("WTA", WTA_PLAYERS),
};

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

function surfacePct(p: BasePlayer, surface: Surface): number {
  return surface === "CLAY" ? p.clayWinPct : surface === "GRASS" ? p.grassWinPct : p.hardWinPct;
}

// --- tournaments -----------------------------------------------------------

interface CalendarEvent extends SeedTournament {
  externalId: string;
  startsAt: Date;
  endsAt: Date;
}

const EVENTS: CalendarEvent[] = CALENDAR_2026.map((t) => ({
  ...t,
  externalId: `mock-2026-${t.slug}`,
  startsAt: new Date(`${t.start}T10:00:00Z`),
  endsAt: new Date(`${t.end}T23:59:59Z`),
}));

function eventById(id: string): CalendarEvent {
  const e = EVENTS.find((x) => x.externalId === id);
  if (!e) throw new Error(`Unknown tournament ${id}`);
  return e;
}

function statusAt(e: CalendarEvent, now: Date): TournamentStatus {
  if (now < e.startsAt) return "UPCOMING";
  if (now > e.endsAt) return "COMPLETED";
  return "LIVE";
}

// --- full bracket simulation ------------------------------------------------

interface SimEntrant {
  player: BasePlayer;
  seed: number | null;
}

interface SimMatch {
  externalId: string;
  tour: Tour;
  round: number; // 1-based
  index: number;
  scheduledAt: Date;
  durationMs: number;
  bestOf: 3 | 5;
  a: SimEntrant;
  b: SimEntrant;
  winnerSide: "A" | "B";
  retired: boolean;
  sets: Array<[number, number]>;
  full: [Omit<ProviderMatchStat, "setsWon" | "setsLost">, Omit<ProviderMatchStat, "setsWon" | "setsLost">];
}

interface SimDraw {
  entrants: SimEntrant[];
  matches: SimMatch[];
}

const drawCache = new Map<string, SimDraw>();

function simulateDraw(event: CalendarEvent, tour: Tour): SimDraw {
  const key = `${event.externalId}:${tour}`;
  const cached = drawCache.get(key);
  if (cached) return cached;

  const rand = seededRandom(key);
  // Field: the 32 best of the pool after a few random withdrawals.
  const field = [...PLAYERS[tour]]
    .map((p) => ({ p, sortKey: p.rank + rand() * 18 }))
    .sort((x, y) => x.sortKey - y.sortKey)
    .slice(0, DRAW_SIZE)
    .map((x) => x.p)
    .sort((x, y) => x.rank - y.rank);

  const seedCount = event.category === "GRAND_SLAM" ? 16 : 8;
  const entrants: SimEntrant[] = field.map((player, i) => ({ player, seed: i < seedCount ? i + 1 : null }));

  // Place seeds, then shuffle the unseeded players into the open lines.
  const lines: (SimEntrant | null)[] = Array(DRAW_SIZE).fill(null);
  entrants.slice(0, seedCount).forEach((e, i) => (lines[SEED_POSITIONS[i]] = e));
  const unseeded = entrants.slice(seedCount);
  for (let i = unseeded.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [unseeded[i], unseeded[j]] = [unseeded[j], unseeded[i]];
  }
  for (let i = 0; i < DRAW_SIZE; i++) if (!lines[i]) lines[i] = unseeded.pop()!;

  const bestOf: 3 | 5 = event.category === "GRAND_SLAM" && tour === "ATP" ? 5 : 3;
  const days = Math.round((event.endsAt.getTime() - event.startsAt.getTime()) / DAY);
  const matches: SimMatch[] = [];
  let current = lines as SimEntrant[];

  for (let round = 1; round <= ROUNDS; round++) {
    const next: SimEntrant[] = [];
    const dayOffset = Math.round(((round - 1) * (days - 1)) / (ROUNDS - 1));
    for (let m = 0; m < current.length / 2; m++) {
      const a = current[2 * m];
      const b = current[2 * m + 1];
      const externalId = `${event.externalId}-${tour.toLowerCase()}-r${round}-m${m + 1}`;
      const scheduledAt = new Date(
        event.startsAt.getTime() + dayOffset * DAY + (m % 8) * 1.5 * HOUR + (tour === "WTA" ? 0.75 * HOUR : 0),
      );
      const sim = simulateMatch(externalId, a, b, event.surface, bestOf, tour);
      matches.push({
        externalId,
        tour,
        round,
        index: m,
        scheduledAt,
        durationMs: (bestOf === 5 ? 3.25 : 2) * HOUR,
        bestOf,
        a,
        b,
        ...sim,
      });
      next.push(sim.winnerSide === "A" ? a : b);
    }
    current = next;
  }

  const draw = { entrants, matches };
  drawCache.set(key, draw);
  return draw;
}

function simulateMatch(
  id: string,
  a: SimEntrant,
  b: SimEntrant,
  surface: Surface,
  bestOf: 3 | 5,
  tour: Tour,
): Pick<SimMatch, "winnerSide" | "retired" | "sets" | "full"> {
  const rand = seededRandom(id);
  const strength = (p: BasePlayer) => 2100 - p.rank * 9 + (surfacePct(p, surface) - 0.6) * 500;
  const pA = 1 / (1 + Math.pow(10, (strength(b.player) - strength(a.player)) / 400));
  const winnerSide: "A" | "B" = rand() < pA ? "A" : "B";

  const toWin = bestOf === 5 ? 3 : 2;
  const closeness = 1 - Math.abs(pA - 0.5) * 2;
  let loserSets = 0;
  for (let i = 0; i < toWin - 1; i++) if (rand() < 0.22 + 0.25 * closeness) loserSets++;

  // Order the sets: the winner always takes the last one.
  const order: ("W" | "L")[] = [...Array(toWin - 1).fill("W"), ...Array(loserSets).fill("L")];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  order.push("W");

  const setScore = (): [number, number] => {
    const r = rand();
    if (r < 0.18) return [7, 6];
    if (r < 0.3) return [7, 5];
    return [6, Math.floor(rand() * 5)];
  };

  let retired = false;
  let played = order;
  if (rand() < 0.02 && order.length > 1) {
    retired = true;
    played = order.slice(0, Math.max(1, Math.floor(rand() * order.length)));
  }

  const sets = played.map((s) => {
    const [w, l] = setScore();
    const winnerTookSet = s === "W";
    const aTookSet = winnerTookSet === (winnerSide === "A");
    return (aTookSet ? [w, l] : [l, w]) as [number, number];
  });

  const aceRate = tour === "ATP" ? 1.9 : 0.75;
  const dfRate = tour === "ATP" ? 0.65 : 0.95;
  const line = (e: SimEntrant, side: "A" | "B") => {
    const won = sets.filter(([x, y]) => (side === "A" ? x > y : y > x)).length;
    const lost = sets.length - won;
    return {
      playerExternalId: e.player.externalId,
      side,
      aces: around(rand, aceRate * e.player.serve * sets.length),
      doubleFaults: around(rand, dfRate * sets.length),
      breakPointsConverted: around(rand, 1.3 * won + 0.5 * lost),
    };
  };

  return { winnerSide, retired, sets, full: [line(a, "A"), line(b, "B")] };
}

/** The visible state of a simulated match at a moment in time. */
function revealMatch(sim: SimMatch, now: Date): ProviderMatch {
  const elapsed = now.getTime() - sim.scheduledAt.getTime();
  const progress = Math.min(1, Math.max(0, elapsed / sim.durationMs));
  const done = progress >= 1;
  const status = progress <= 0 ? "SCHEDULED" : done ? (sim.retired ? "RETIRED" : "COMPLETED") : "LIVE";

  const visibleSets = done ? sim.sets : sim.sets.slice(0, Math.floor(progress * sim.sets.length));
  const scale = (n: number) => (done ? n : Math.floor(n * progress));
  const stat = (i: 0 | 1): ProviderMatchStat => {
    const s = sim.full[i];
    const won = visibleSets.filter(([x, y]) => (i === 0 ? x > y : y > x)).length;
    return {
      ...s,
      aces: scale(s.aces),
      doubleFaults: scale(s.doubleFaults),
      breakPointsConverted: scale(s.breakPointsConverted),
      setsWon: won,
      setsLost: visibleSets.length - won,
    };
  };

  return {
    externalId: sim.externalId,
    tour: sim.tour,
    round: sim.round,
    roundName: ROUND_NAMES[sim.round - 1],
    status,
    scheduledAt: sim.scheduledAt,
    bestOf: sim.bestOf,
    winnerExternalId: done ? (sim.winnerSide === "A" ? sim.a : sim.b).player.externalId : null,
    score: visibleSets,
    stats: [stat(0), stat(1)],
  };
}

function isFinished(sim: SimMatch, now: Date) {
  return now.getTime() >= sim.scheduledAt.getTime() + sim.durationMs;
}

// --- provider --------------------------------------------------------------

export class MockTennisProvider implements TennisDataProvider {
  readonly name = "mock";

  constructor(private readonly now: () => Date = () => new Date()) {}

  async getRankings(tour: Tour): Promise<ProviderPlayer[]> {
    const now = this.now();
    // Season record and form come from simulated results already played.
    const results = new Map<string, { at: number; won: boolean }[]>();
    for (const event of EVENTS) {
      if (!event.tours.includes(tour) || event.startsAt > now) continue;
      for (const m of simulateDraw(event, tour).matches) {
        if (!isFinished(m, now)) continue;
        const at = m.scheduledAt.getTime();
        for (const side of ["A", "B"] as const) {
          const id = (side === "A" ? m.a : m.b).player.externalId;
          const list = results.get(id) ?? [];
          list.push({ at, won: m.winnerSide === side });
          results.set(id, list);
        }
      }
    }
    return PLAYERS[tour].map((p) => {
      const r = (results.get(p.externalId) ?? []).sort((x, y) => y.at - x.at);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { serve, ...rest } = p;
      return {
        ...rest,
        seasonWins: r.filter((x) => x.won).length,
        seasonLosses: r.filter((x) => !x.won).length,
        recentForm: r
          .slice(0, 10)
          .map((x) => (x.won ? "W" : "L"))
          .join(""),
      };
    });
  }

  async getTournaments(season: number): Promise<ProviderTournament[]> {
    if (season !== 2026) return [];
    const now = this.now();
    return EVENTS.map((e) => ({
      externalId: e.externalId,
      name: e.name,
      category: e.category,
      surface: e.surface,
      tours: e.tours,
      location: e.location,
      season,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      status: statusAt(e, now),
    }));
  }

  async getEntries(tournamentExternalId: string): Promise<ProviderEntry[]> {
    const event = eventById(tournamentExternalId);
    const now = this.now();
    return event.tours.flatMap((tour) => {
      const draw = simulateDraw(event, tour);
      const losers = new Set(
        draw.matches
          .filter((m) => isFinished(m, now))
          .map((m) => (m.winnerSide === "A" ? m.b : m.a).player.externalId),
      );
      return draw.entrants.map((e) => ({
        playerExternalId: e.player.externalId,
        tour,
        seed: e.seed,
        eliminated: losers.has(e.player.externalId),
      }));
    });
  }

  async getMatches(tournamentExternalId: string): Promise<ProviderMatch[]> {
    const event = eventById(tournamentExternalId);
    const now = this.now();
    return event.tours.flatMap((tour) => {
      const { matches } = simulateDraw(event, tour);
      const byKey = new Map(matches.map((m) => [`${m.round}:${m.index}`, m]));
      // A later-round match exists once both feeder matches have finished.
      const known = (m: SimMatch): boolean => {
        if (m.round === 1) return true;
        const f1 = byKey.get(`${m.round - 1}:${2 * m.index}`)!;
        const f2 = byKey.get(`${m.round - 1}:${2 * m.index + 1}`)!;
        return isFinished(f1, now) && isFinished(f2, now);
      };
      return matches.filter(known).map((m) => revealMatch(m, now));
    });
  }
}
