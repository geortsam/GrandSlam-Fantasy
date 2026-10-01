import { cached } from "./cache";
import { prisma } from "./db";

export interface LiveMatchPlayer {
  id: string;
  name: string;
  country: string;
  seed: number | null;
  aces: number;
  doubleFaults: number;
  breakPointsConverted: number;
  fantasyPoints: number;
  winner: boolean;
}

export interface LiveMatch {
  id: string;
  tour: string;
  round: number;
  roundName: string;
  status: string;
  scheduledAt: string;
  score: Array<[number, number]>;
  players: [LiveMatchPlayer, LiveMatchPlayer];
}

export async function getTournamentMatches(tournamentId: string): Promise<LiveMatch[]> {
  return cached(`matches:${tournamentId}`, 15, async () => {
    const matches = await prisma.match.findMany({
      where: { tournamentId },
      include: { stats: { include: { player: { select: { id: true, name: true, country: true } } } } },
      orderBy: [{ round: "desc" }, { scheduledAt: "asc" }],
    });
    return matches
      .filter((m) => m.stats.length === 2)
      .map((m) => {
        const sorted = [...m.stats].sort((a, b) => a.side.localeCompare(b.side));
        return {
          id: m.id,
          tour: m.tour,
          round: m.round,
          roundName: m.roundName,
          status: m.status,
          scheduledAt: m.scheduledAt.toISOString(),
          score: m.score as Array<[number, number]>,
          players: sorted.map((s) => ({
            id: s.player.id,
            name: s.player.name,
            country: s.player.country,
            seed: s.seed,
            aces: s.aces,
            doubleFaults: s.doubleFaults,
            breakPointsConverted: s.breakPointsConverted,
            fantasyPoints: s.fantasyPoints,
            winner: m.winnerId === s.player.id,
          })) as [LiveMatchPlayer, LiveMatchPlayer],
        };
      });
  });
}
