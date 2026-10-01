// League, roster and leaderboard services shared by API routes and pages.
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "./db";
import { bumpScoresGeneration, cached } from "./cache";
import { isLocked } from "./domain/lock";
import { eligibleTours, validateRoster, type PlayerInfo } from "./domain/roster";
import { headToHeadStandings, pointsStandings, rosterPoints, type WeekResult } from "./domain/standings";
import type { Tour, TourMode } from "./domain/types";
import { currentSeason } from "./sync";

export class ServiceError extends Error {
  constructor(
    message: string,
    public status = 400,
    public details?: string[],
  ) {
    super(message);
  }
}

// --- create / join -----------------------------------------------------------

export const createLeagueSchema = z
  .object({
    name: z.string().trim().min(3).max(60),
    teamName: z.string().trim().min(2).max(40),
    mode: z.enum(["TOURNAMENT", "SEASON"]),
    seasonFormat: z.enum(["HEAD_TO_HEAD", "POINTS"]).default("POINTS"),
    tourMode: z.enum(["ATP", "WTA", "MIXED"]),
    visibility: z.enum(["PUBLIC", "PRIVATE"]),
    passcode: z.string().trim().min(4).max(32).optional().or(z.literal("").transform(() => undefined)),
    tournamentId: z.string().optional(),
    maxMembers: z.coerce.number().int().min(2).max(50).default(12),
    salaryCap: z.coerce.number().min(60).max(200).default(100),
  })
  .refine((v) => v.mode === "SEASON" || !!v.tournamentId, {
    message: "Pick a tournament for a tournament league.",
    path: ["tournamentId"],
  });

export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;

function newInviteCode(): string {
  // 8 chars from an unambiguous alphabet.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return [...randomBytes(8)].map((b) => alphabet[b % alphabet.length]).join("");
}

export async function createLeague(userId: string, input: CreateLeagueInput) {
  let tournamentId: string | null = null;
  if (input.mode === "TOURNAMENT") {
    const t = await prisma.tournament.findUnique({ where: { id: input.tournamentId! } });
    if (!t) throw new ServiceError("That tournament doesn't exist.");
    if (isLocked(t.startsAt)) throw new ServiceError("That tournament has already started.");
    if (eligibleTours(input.tourMode, t.tours as Tour[]).length === 0) {
      throw new ServiceError(`${t.name} has no ${input.tourMode} draw.`);
    }
    tournamentId = t.id;
  }
  const league = await prisma.league.create({
    data: {
      name: input.name,
      mode: input.mode,
      seasonFormat: input.seasonFormat,
      tourMode: input.tourMode,
      visibility: input.visibility,
      passcodeHash: input.passcode ? await bcrypt.hash(input.passcode, 10) : null,
      inviteCode: newInviteCode(),
      maxMembers: input.maxMembers,
      salaryCap: input.salaryCap,
      season: currentSeason(),
      tournamentId,
      commissionerId: userId,
      members: { create: { userId, teamName: input.teamName } },
    },
  });
  return league;
}

export const joinLeagueSchema = z.object({
  inviteCode: z.string().trim().toUpperCase().min(4).max(16),
  passcode: z.string().optional(),
  teamName: z.string().trim().min(2).max(40),
});

export async function joinLeague(userId: string, input: z.infer<typeof joinLeagueSchema>) {
  const league = await prisma.league.findUnique({
    where: { inviteCode: input.inviteCode },
    include: { _count: { select: { members: true } } },
  });
  if (!league) throw new ServiceError("No league matches that invite code.", 404);
  const existing = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: league.id, userId } },
  });
  if (existing) return league;
  if (league._count.members >= league.maxMembers) throw new ServiceError("This league is full.");
  if (league.passcodeHash) {
    const ok = input.passcode ? await bcrypt.compare(input.passcode, league.passcodeHash) : false;
    if (!ok) throw new ServiceError("Wrong passcode.", 403);
  }
  await prisma.leagueMember.create({ data: { leagueId: league.id, userId, teamName: input.teamName } });
  await bumpScoresGeneration();
  return league;
}

// --- league tournaments ------------------------------------------------------

export async function leagueTournaments(league: {
  mode: string;
  tourMode: TourMode;
  season: number;
  tournamentId: string | null;
}) {
  if (league.mode === "TOURNAMENT") {
    return league.tournamentId
      ? prisma.tournament.findMany({ where: { id: league.tournamentId } })
      : [];
  }
  const all = await prisma.tournament.findMany({
    where: { season: league.season },
    orderBy: { startsAt: "asc" },
  });
  return all.filter((t) => eligibleTours(league.tourMode, t.tours as Tour[]).length > 0);
}

/** The tournament a roster should be set for now: the live one, else the next to start. */
export function focusTournament<T extends { status: string; startsAt: Date }>(tournaments: T[]): T | undefined {
  return (
    tournaments.find((t) => t.status === "LIVE") ??
    tournaments.find((t) => t.status === "UPCOMING") ??
    tournaments[tournaments.length - 1]
  );
}

// --- player points -----------------------------------------------------------

export async function playerPointsForTournament(tournamentId: string): Promise<Map<string, number>> {
  const rows = await prisma.matchPlayerStat.groupBy({
    by: ["playerId"],
    where: { match: { tournamentId } },
    _sum: { fantasyPoints: true },
  });
  return new Map(rows.map((r) => [r.playerId, Math.round((r._sum.fantasyPoints ?? 0) * 100) / 100]));
}

// --- leaderboard -------------------------------------------------------------

export interface LeaderboardRow {
  memberId: string;
  userId: string;
  teamName: string;
  ownerName: string;
  points: number;
  livePoints: number;
  currentPoints: number;
  wins: number;
  losses: number;
  ties: number;
  hasRoster: boolean;
}

export interface Leaderboard {
  leagueId: string;
  format: "TOURNAMENT" | "POINTS" | "HEAD_TO_HEAD";
  current: { id: string; name: string; status: string; startsAt: string } | null;
  rows: LeaderboardRow[];
  updatedAt: string;
}

export async function getLeaderboard(leagueId: string): Promise<Leaderboard> {
  return cached(`leaderboard:${leagueId}`, 20, () => computeLeaderboard(leagueId));
}

async function computeLeaderboard(leagueId: string): Promise<Leaderboard> {
  const league = await prisma.league.findUniqueOrThrow({
    where: { id: leagueId },
    include: { members: { include: { user: { select: { name: true, email: true } } }, orderBy: { joinedAt: "asc" } } },
  });
  const tournaments = await leagueTournaments(league);
  const started = tournaments.filter((t) => t.status !== "UPCOMING");
  const memberIds = league.members.map((m) => m.id);

  const rosters = await prisma.roster.findMany({
    where: { memberId: { in: memberIds }, tournamentId: { in: tournaments.map((t) => t.id) } },
    include: { slots: { select: { playerId: true, slot: true } } },
  });

  const weeks: WeekResult[] = [];
  for (const t of started) {
    const pts = await playerPointsForTournament(t.id);
    const points = new Map<string, number>();
    for (const r of rosters.filter((x) => x.tournamentId === t.id)) {
      points.set(r.memberId, rosterPoints(r.slots, pts));
    }
    weeks.push({ points, final: t.status === "COMPLETED" });
  }

  const current = focusTournament(tournaments);
  const currentWeek = current ? started.indexOf(current) : -1;
  const standings =
    league.mode === "SEASON" && league.seasonFormat === "HEAD_TO_HEAD"
      ? headToHeadStandings(memberIds, weeks)
      : pointsStandings(memberIds, weeks);

  const memberById = new Map(league.members.map((m) => [m.id, m]));
  return {
    leagueId,
    format: league.mode === "TOURNAMENT" ? "TOURNAMENT" : league.seasonFormat,
    current: current
      ? { id: current.id, name: current.name, status: current.status, startsAt: current.startsAt.toISOString() }
      : null,
    rows: standings.map((s) => {
      const m = memberById.get(s.memberId)!;
      return {
        ...s,
        userId: m.userId,
        teamName: m.teamName,
        ownerName: m.user.name ?? m.user.email?.split("@")[0] ?? "Player",
        currentPoints: currentWeek >= 0 ? (weeks[currentWeek].points.get(s.memberId) ?? 0) : 0,
        hasRoster: !!current && rosters.some((r) => r.memberId === s.memberId && r.tournamentId === current.id),
      };
    }),
    updatedAt: new Date().toISOString(),
  };
}

// --- rosters -----------------------------------------------------------------

export const saveRosterSchema = z.object({
  tournamentId: z.string(),
  picks: z
    .array(z.object({ playerId: z.string(), slot: z.enum(["STARTER", "CAPTAIN", "BENCH"]) }))
    .max(8),
});

export async function getMembership(leagueId: string, userId: string) {
  return prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId } },
    include: { league: true },
  });
}

export async function saveRoster(userId: string, leagueId: string, input: z.infer<typeof saveRosterSchema>) {
  const member = await getMembership(leagueId, userId);
  if (!member) throw new ServiceError("You're not in this league.", 403);
  const { league } = member;

  const tournaments = await leagueTournaments(league);
  const tournament = tournaments.find((t) => t.id === input.tournamentId);
  if (!tournament) throw new ServiceError("This tournament isn't part of the league.");
  if (isLocked(tournament.startsAt)) {
    throw new ServiceError("Rosters locked when the tournament started.", 423);
  }

  const allowedTours = eligibleTours(league.tourMode, tournament.tours as Tour[]);
  const playerIds = input.picks.map((p) => p.playerId);
  const [players, entries, existing] = await Promise.all([
    prisma.player.findMany({ where: { id: { in: playerIds } } }),
    prisma.tournamentEntry.findMany({ where: { tournamentId: tournament.id, playerId: { in: playerIds } } }),
    prisma.roster.findUnique({
      where: { memberId_tournamentId: { memberId: member.id, tournamentId: tournament.id } },
      include: { slots: true },
    }),
  ]);
  const entered = new Set(entries.map((e) => e.playerId));
  // Players already on the roster keep the price they were bought at.
  const lockedPrice = new Map(existing?.slots.map((s) => [s.playerId, s.salary]) ?? []);
  const info = new Map<string, PlayerInfo>(
    players.map((p) => [
      p.id,
      { id: p.id, tour: p.tour, salary: lockedPrice.get(p.id) ?? p.salary, entered: entered.has(p.id) },
    ]),
  );

  const result = validateRoster(input.picks, info, { allowedTours, salaryCap: league.salaryCap });
  if (!result.ok) throw new ServiceError("That roster isn't valid.", 422, result.errors);

  const roster = await prisma.$transaction(async (tx) => {
    const r = await tx.roster.upsert({
      where: { memberId_tournamentId: { memberId: member.id, tournamentId: tournament.id } },
      create: { memberId: member.id, tournamentId: tournament.id },
      update: {},
    });
    await tx.rosterSlot.deleteMany({ where: { rosterId: r.id } });
    await tx.rosterSlot.createMany({
      data: input.picks.map((p) => ({
        rosterId: r.id,
        playerId: p.playerId,
        slot: p.slot,
        salary: info.get(p.playerId)!.salary,
      })),
    });
    return r;
  });
  await bumpScoresGeneration();
  return { rosterId: roster.id, totalSalary: result.totalSalary };
}

/** Everything the roster builder needs for one member and tournament. */
export async function getRosterBuilder(userId: string, leagueId: string, tournamentId?: string) {
  const member = await getMembership(leagueId, userId);
  if (!member) return null;
  const { league } = member;
  const tournaments = await leagueTournaments(league);
  const tournament = tournamentId ? tournaments.find((t) => t.id === tournamentId) : focusTournament(tournaments);
  if (!tournament) return { league, member, tournaments, tournament: null } as const;

  const allowedTours = eligibleTours(league.tourMode, tournament.tours as Tour[]);
  const [entries, roster, points] = await Promise.all([
    prisma.tournamentEntry.findMany({
      where: { tournamentId: tournament.id, player: { tour: { in: allowedTours } } },
      include: { player: true },
      orderBy: { player: { rank: "asc" } },
    }),
    prisma.roster.findUnique({
      where: { memberId_tournamentId: { memberId: member.id, tournamentId: tournament.id } },
      include: { slots: true },
    }),
    playerPointsForTournament(tournament.id),
  ]);

  // Season leagues carry the previous roster forward as a starting point.
  let picks = roster?.slots.map((s) => ({ playerId: s.playerId, slot: s.slot, salary: s.salary })) ?? [];
  let carriedOver = false;
  if (!roster && league.mode === "SEASON") {
    const previous = await prisma.roster.findFirst({
      where: { memberId: member.id, tournament: { startsAt: { lt: tournament.startsAt } } },
      orderBy: { tournament: { startsAt: "desc" } },
      include: { slots: true },
    });
    const enteredIds = new Set(entries.map((e) => e.playerId));
    const priceNow = new Map(entries.map((e) => [e.playerId, e.player.salary]));
    picks =
      previous?.slots
        .filter((s) => enteredIds.has(s.playerId))
        .map((s) => ({ playerId: s.playerId, slot: s.slot, salary: priceNow.get(s.playerId)! })) ?? [];
    carriedOver = picks.length > 0;
  }

  return {
    league,
    member,
    tournaments,
    tournament,
    allowedTours,
    carriedOver,
    picks,
    players: entries.map((e) => ({
      id: e.player.id,
      name: e.player.name,
      tour: e.player.tour,
      country: e.player.country,
      rank: e.player.rank,
      seed: e.seed,
      salary: e.player.salary,
      eliminated: e.eliminated,
      recentForm: e.player.recentForm,
      surfacePct:
        tournament.surface === "CLAY"
          ? e.player.clayWinPct
          : tournament.surface === "GRASS"
            ? e.player.grassWinPct
            : e.player.hardWinPct,
      points: points.get(e.player.id) ?? 0,
    })),
  } as const;
}
