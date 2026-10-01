// Pulls rankings, calendars, draws and live scores from the tennis provider
// into Postgres and scores every match. Called by the cron routes and the seed.
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { bumpScoresGeneration } from "./cache";
import { computeSalary } from "./domain/salary";
import { scoreMatch } from "./domain/scoring";
import type { Tour } from "./domain/types";
import { getTennisProvider, type TennisDataProvider } from "./tennis";

export function currentSeason(now = new Date()): number {
  return Number(process.env.SEASON ?? now.getUTCFullYear());
}

export async function syncRankings(provider: TennisDataProvider = getTennisProvider()) {
  let count = 0;
  for (const tour of ["ATP", "WTA"] as Tour[]) {
    const players = await provider.getRankings(tour);
    for (const p of players) {
      const form = p.recentForm || (await formFromMatches(p.externalId));
      const data = {
        name: p.name,
        tour: p.tour,
        country: p.country,
        rank: p.rank,
        rankPoints: p.rankPoints,
        hardWinPct: p.hardWinPct,
        clayWinPct: p.clayWinPct,
        grassWinPct: p.grassWinPct,
        seasonWins: p.seasonWins,
        seasonLosses: p.seasonLosses,
        recentForm: form,
        salary: computeSalary(p.rank, form),
      };
      await prisma.player.upsert({
        where: { externalId: p.externalId },
        create: { externalId: p.externalId, ...data },
        update: data,
      });
      count++;
    }
  }
  return { players: count };
}

/** Form from stored matches, for providers whose rankings feed has none. */
async function formFromMatches(externalId: string): Promise<string> {
  const player = await prisma.player.findUnique({ where: { externalId }, select: { id: true } });
  if (!player) return "";
  const stats = await prisma.matchPlayerStat.findMany({
    where: { playerId: player.id, match: { status: { in: ["COMPLETED", "RETIRED", "WALKOVER"] } } },
    include: { match: { select: { winnerId: true, scheduledAt: true } } },
    orderBy: { match: { scheduledAt: "desc" } },
    take: 10,
  });
  return stats.map((s) => (s.match.winnerId === player.id ? "W" : "L")).join("");
}

export async function syncTournaments(
  season = currentSeason(),
  provider: TennisDataProvider = getTennisProvider(),
) {
  const tournaments = await provider.getTournaments(season);
  for (const t of tournaments) {
    const data = {
      name: t.name,
      category: t.category,
      surface: t.surface,
      tours: t.tours,
      location: t.location,
      season: t.season,
      startsAt: t.startsAt,
      endsAt: t.endsAt,
      status: t.status,
    };
    await prisma.tournament.upsert({
      where: { externalId: t.externalId },
      create: { externalId: t.externalId, ...data },
      update: data,
    });
  }
  return { tournaments: tournaments.length };
}

/** Syncs one tournament's draw and matches, and rescores every match in it. */
export async function syncTournament(
  externalId: string,
  provider: TennisDataProvider = getTennisProvider(),
) {
  const tournament = await prisma.tournament.findUniqueOrThrow({ where: { externalId } });
  const [entries, matches] = await Promise.all([
    provider.getEntries(externalId),
    provider.getMatches(externalId),
  ]);

  const externalIds = [
    ...new Set([
      ...entries.map((e) => e.playerExternalId),
      ...matches.flatMap((m) => m.stats.map((s) => s.playerExternalId)),
    ]),
  ];
  const players = await prisma.player.findMany({
    where: { externalId: { in: externalIds } },
    select: { id: true, externalId: true },
  });
  const idOf = new Map(players.map((p) => [p.externalId, p.id]));
  const seedOf = new Map(entries.map((e) => [e.playerExternalId, e.seed]));

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  for (const e of entries) {
    const playerId = idOf.get(e.playerExternalId);
    if (!playerId) continue; // outside the synced rankings
    ops.push(
      prisma.tournamentEntry.upsert({
        where: { tournamentId_playerId: { tournamentId: tournament.id, playerId } },
        create: { tournamentId: tournament.id, playerId, seed: e.seed, eliminated: e.eliminated },
        update: { seed: e.seed, eliminated: e.eliminated },
      }),
    );
  }
  await prisma.$transaction(ops);

  // Finished matches already stored as finished don't change; skip them so
  // live polls only touch matches in play.
  const FINAL = ["COMPLETED", "RETIRED", "WALKOVER"];
  const settled = new Set(
    (
      await prisma.match.findMany({
        where: { tournamentId: tournament.id, status: { in: ["COMPLETED", "RETIRED", "WALKOVER"] } },
        select: { externalId: true },
      })
    ).map((m) => m.externalId),
  );

  let scored = 0;
  for (const m of matches) {
    if (settled.has(m.externalId) && FINAL.includes(m.status)) continue;
    const [a, b] = m.stats;
    const aId = idOf.get(a.playerExternalId);
    const bId = idOf.get(b.playerExternalId);
    if (!aId || !bId) continue;
    const winnerId = m.winnerExternalId ? (idOf.get(m.winnerExternalId) ?? null) : null;
    const completed = FINAL.includes(m.status);

    const match = await prisma.match.upsert({
      where: { externalId: m.externalId },
      create: {
        externalId: m.externalId,
        tournamentId: tournament.id,
        tour: m.tour,
        round: m.round,
        roundName: m.roundName,
        status: m.status,
        scheduledAt: m.scheduledAt,
        bestOf: m.bestOf,
        winnerId,
        score: m.score,
      },
      update: { status: m.status, scheduledAt: m.scheduledAt, winnerId, score: m.score, roundName: m.roundName },
    });

    const statOps = m.stats.map((s, i) => {
      const playerId = i === 0 ? aId : bId;
      const opponent = i === 0 ? b : a;
      const seed = seedOf.get(s.playerExternalId) ?? null;
      const breakdown = scoreMatch({
        won: winnerId === playerId,
        completed,
        completedByRetirement: m.status === "RETIRED" || m.status === "WALKOVER",
        setsWon: s.setsWon,
        setsLost: s.setsLost,
        aces: s.aces,
        doubleFaults: s.doubleFaults,
        breakPointsConverted: s.breakPointsConverted,
        seed,
        opponentSeed: seedOf.get(opponent.playerExternalId) ?? null,
      });
      const data = {
        side: s.side,
        seed,
        aces: s.aces,
        doubleFaults: s.doubleFaults,
        breakPointsConverted: s.breakPointsConverted,
        setsWon: s.setsWon,
        setsLost: s.setsLost,
        fantasyPoints: breakdown.total,
        breakdown: { ...breakdown },
      };
      return prisma.matchPlayerStat.upsert({
        where: { matchId_playerId: { matchId: match.id, playerId } },
        create: { matchId: match.id, playerId, ...data },
        update: data,
      });
    });
    await prisma.$transaction(statOps);
    scored++;
  }

  return { tournament: tournament.name, entries: entries.length, matches: scored };
}

/**
 * The cron entry point for live scoring: refreshes tournament statuses, then
 * re-syncs every tournament that is live or just started/finished.
 */
export async function pollLiveScores(provider: TennisDataProvider = getTennisProvider()) {
  await syncTournaments(currentSeason(), provider);
  const now = Date.now();
  const window = 36 * 3_600_000;
  const active = await prisma.tournament.findMany({
    where: {
      season: currentSeason(),
      startsAt: { lte: new Date(now + window) },
      endsAt: { gte: new Date(now - window) },
    },
    select: { externalId: true },
  });
  const results = [];
  for (const t of active) results.push(await syncTournament(t.externalId, provider));
  await bumpScoresGeneration();
  return { polled: results };
}

/** Everything: rankings, calendar and every tournament's draw. Used by seed and nightly sync. */
export async function fullSync(provider: TennisDataProvider = getTennisProvider()) {
  const season = currentSeason();
  const rankings = await syncRankings(provider);
  const calendar = await syncTournaments(season, provider);
  const tournaments = await prisma.tournament.findMany({ where: { season }, select: { externalId: true } });
  const synced = [];
  for (const t of tournaments) synced.push(await syncTournament(t.externalId, provider));
  // A second rankings pass picks up form derived from the matches just stored.
  if (provider.name !== "mock") await syncRankings(provider);
  await bumpScoresGeneration();
  return { ...rankings, ...calendar, synced: synced.length };
}

/** Nightly job: rankings and salaries, the calendar, and draws for the next two weeks. */
export async function nightlySync(provider: TennisDataProvider = getTennisProvider()) {
  const season = currentSeason();
  const rankings = await syncRankings(provider);
  const calendar = await syncTournaments(season, provider);
  const soon = await prisma.tournament.findMany({
    where: { season, status: { not: "COMPLETED" }, startsAt: { lte: new Date(Date.now() + 14 * 86_400_000) } },
    select: { externalId: true },
  });
  for (const t of soon) await syncTournament(t.externalId, provider);
  await bumpScoresGeneration();
  return { ...rankings, ...calendar, draws: soon.length };
}
