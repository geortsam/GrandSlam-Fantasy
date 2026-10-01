// Seeds a working demo: syncs the season from the tennis provider, then
// creates demo managers, three leagues and rosters for every tournament so
// leaderboards have history. Safe to re-run.
import { PrismaClient } from "@prisma/client";
import { autoPick } from "../src/lib/domain/autopick";
import { eligibleTours } from "../src/lib/domain/roster";
import type { Tour, TourMode } from "../src/lib/domain/types";
import { seededRandom } from "../src/lib/tennis/mock-provider";
import { currentSeason, fullSync } from "../src/lib/sync";

const prisma = new PrismaClient();

const MANAGERS = [
  { name: "Demo Manager", email: "demo@grandslam.local", team: "Baseline Bandits" },
  { name: "Rafa Fan", email: "rafa@grandslam.local", team: "Topspin Titans" },
  { name: "Serena Stan", email: "serena@grandslam.local", team: "Ace Avengers" },
  { name: "Net Rusher", email: "net@grandslam.local", team: "Serve & Volley Club" },
  { name: "Clay Queen", email: "clay@grandslam.local", team: "Red Dirt Royals" },
  { name: "Grass Guru", email: "grass@grandslam.local", team: "Lawn Legends" },
];

async function main() {
  console.log("Syncing tennis data…");
  console.log(await fullSync());

  const users = [];
  for (const m of MANAGERS) {
    users.push(
      await prisma.user.upsert({ where: { email: m.email }, create: { email: m.email, name: m.name }, update: {} }),
    );
  }

  const season = currentSeason();
  const wuhan = await prisma.tournament.findFirst({ where: { name: "Wuhan Open", season } });

  const leagues: Array<{
    inviteCode: string;
    name: string;
    mode: "TOURNAMENT" | "SEASON";
    seasonFormat: "HEAD_TO_HEAD" | "POINTS";
    tourMode: TourMode;
    visibility: "PUBLIC" | "PRIVATE";
    tournamentId: string | null;
  }> = [
    { inviteCode: "DEMOMIX1", name: "Grand Slam Club", mode: "SEASON", seasonFormat: "POINTS", tourMode: "MIXED", visibility: "PUBLIC", tournamentId: null },
    { inviteCode: "DEMOH2H1", name: "ATP Head-to-Head", mode: "SEASON", seasonFormat: "HEAD_TO_HEAD", tourMode: "ATP", visibility: "PUBLIC", tournamentId: null },
    { inviteCode: "DEMOWUH1", name: "Wuhan Showdown", mode: "TOURNAMENT", seasonFormat: "POINTS", tourMode: "WTA", visibility: "PUBLIC", tournamentId: wuhan?.id ?? null },
  ];

  for (const l of leagues) {
    if (l.mode === "TOURNAMENT" && !l.tournamentId) continue;
    const league = await prisma.league.upsert({
      where: { inviteCode: l.inviteCode },
      create: { ...l, season, salaryCap: 100, maxMembers: 12, commissionerId: users[0].id },
      update: {},
    });
    for (const [i, u] of users.entries()) {
      await prisma.leagueMember.upsert({
        where: { leagueId_userId: { leagueId: league.id, userId: u.id } },
        create: { leagueId: league.id, userId: u.id, teamName: MANAGERS[i].team },
        update: {},
      });
    }

    // Rosters for every tournament that has started (they were "set" before lock).
    const tournaments = await prisma.tournament.findMany({
      where: l.mode === "TOURNAMENT" ? { id: l.tournamentId! } : { season, status: { not: "UPCOMING" } },
    });
    const members = await prisma.leagueMember.findMany({ where: { leagueId: league.id } });
    for (const t of tournaments) {
      const allowed = eligibleTours(l.tourMode, t.tours as Tour[]);
      if (allowed.length === 0) continue;
      const entries = await prisma.tournamentEntry.findMany({ where: { tournamentId: t.id }, include: { player: true } });
      const pool = entries.map((e) => ({ id: e.playerId, tour: e.player.tour as Tour, salary: e.player.salary, entered: true }));
      const salary = new Map(pool.map((p) => [p.id, p.salary]));
      for (const m of members) {
        // Leave the demo user's upcoming roster empty so they can build one.
        if (t.status === "UPCOMING" && m.userId === users[0].id) continue;
        const exists = await prisma.roster.findUnique({ where: { memberId_tournamentId: { memberId: m.id, tournamentId: t.id } } });
        if (exists) continue;
        const picks = autoPick(pool, allowed, league.salaryCap, seededRandom(`${league.id}:${m.id}:${t.id}`));
        if (!picks) continue;
        await prisma.roster.create({
          data: {
            memberId: m.id,
            tournamentId: t.id,
            slots: { create: picks.map((p) => ({ playerId: p.playerId, slot: p.slot, salary: salary.get(p.playerId)! })) },
          },
        });
      }
    }
    console.log(`League ready: ${league.name} (invite ${league.inviteCode})`);
  }
}

main()
  .then(() => prisma.$disconnect())
  // The sync layer holds its own DB and Redis connections; exit explicitly.
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
