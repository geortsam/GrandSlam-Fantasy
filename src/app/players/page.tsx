import { Search } from "lucide-react";
import { FormGuide, TourBadge } from "@/components/tennis";
import { TourToggle } from "@/components/tour-toggle";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { formatSalary } from "@/lib/utils";

export const metadata = { title: "Players" };
export const dynamic = "force-dynamic";

const SORTS: Record<string, Prisma.PlayerOrderByWithRelationInput[]> = {
  rank: [{ rank: "asc" }, { tour: "asc" }],
  salary: [{ salary: "desc" }, { rank: "asc" }],
  hard: [{ hardWinPct: "desc" }],
  clay: [{ clayWinPct: "desc" }],
  grass: [{ grassWinPct: "desc" }],
  wins: [{ seasonWins: "desc" }],
};

function specialty(p: { hardWinPct: number; clayWinPct: number; grassWinPct: number }) {
  const best = Math.max(p.hardWinPct, p.clayWinPct, p.grassWinPct);
  if (best === p.clayWinPct) return { label: "Clay", cls: "text-clay" };
  if (best === p.grassWinPct) return { label: "Grass", cls: "text-grass" };
  return { label: "Hard", cls: "text-hard" };
}

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ tour?: string; q?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const tour = params.tour === "ATP" || params.tour === "WTA" ? params.tour : "ALL";
  const sort = params.sort && SORTS[params.sort] ? params.sort : "rank";
  const q = params.q?.slice(0, 60);

  const [players, live] = await Promise.all([
    prisma.player.findMany({
      where: {
        ...(tour !== "ALL" ? { tour } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: SORTS[sort],
      take: 200,
    }),
    prisma.tournamentEntry.findMany({
      where: { eliminated: false, tournament: { status: "LIVE" } },
      select: { playerId: true, tournament: { select: { name: true } } },
    }),
  ]);
  const activeIn = new Map(live.map((e) => [e.playerId, e.tournament.name]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold uppercase italic leading-none md:text-5xl">Players</h1>
          <p className="text-muted-foreground">Rankings, surface records, form and fantasy salary.</p>
        </div>
        <TourToggle value={tour} />
      </div>

      <form className="flex flex-wrap gap-2" role="search">
        <input type="hidden" name="tour" value={tour} />
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input name="q" defaultValue={q} placeholder="Search by name" aria-label="Search players" className="pl-9" />
        </div>
        <Select name="sort" defaultValue={sort} aria-label="Sort by" className="w-auto">
          <option value="rank">Rank</option>
          <option value="salary">Salary</option>
          <option value="wins">Season wins</option>
          <option value="hard">Hard court win %</option>
          <option value="clay">Clay win %</option>
          <option value="grass">Grass win %</option>
        </Select>
        <Button type="submit" variant="secondary">
          Apply
        </Button>
      </form>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Rank</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="hidden sm:table-cell">W-L</TableHead>
              <TableHead className="hidden lg:table-cell">Hard / Clay / Grass</TableHead>
              <TableHead className="hidden md:table-cell">Form</TableHead>
              <TableHead className="text-right">Salary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((p) => {
              const spec = specialty(p);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-display text-lg font-bold">{p.rank}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <TourBadge tour={p.tour} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.country} · {p.rankPoints.toLocaleString()} pts ·{" "}
                          <span className={`font-semibold ${spec.cls}`}>{spec.label} specialist</span>
                          {activeIn.has(p.id) && <> · Playing {activeIn.get(p.id)}</>}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden tabular-nums sm:table-cell">
                    {p.seasonWins}-{p.seasonLosses}
                  </TableCell>
                  <TableCell className="hidden tabular-nums lg:table-cell">
                    {Math.round(p.hardWinPct * 100)}% / {Math.round(p.clayWinPct * 100)}% / {Math.round(p.grassWinPct * 100)}%
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <FormGuide form={p.recentForm} />
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatSalary(p.salary)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
