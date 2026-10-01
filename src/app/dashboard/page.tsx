import { Plus, Ticket } from "lucide-react";
import Link from "next/link";
import { CategoryLabel, StatusBadge, SurfaceBadge } from "@/components/tennis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLeaderboard } from "@/lib/leagues";
import { formatDateRange, formatPoints } from "@/lib/utils";
import { leagueModeLabel } from "@/lib/labels";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const [memberships, tournaments] = await Promise.all([
    prisma.leagueMember.findMany({
      where: { userId: user.id },
      include: { league: true },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.tournament.findMany({
      where: { status: { in: ["LIVE", "UPCOMING"] } },
      orderBy: { startsAt: "asc" },
      take: 4,
    }),
  ]);
  const boards = await Promise.all(memberships.map((m) => getLeaderboard(m.leagueId)));

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase">Your leagues</h1>
          <p className="text-muted-foreground">Welcome back{user.name ? `, ${user.name}` : ""}.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/leagues/join">
              <Ticket /> Join
            </Link>
          </Button>
          <Button asChild>
            <Link href="/leagues/new">
              <Plus /> Create league
            </Link>
          </Button>
        </div>
      </div>

      {memberships.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No leagues yet</CardTitle>
            <CardDescription>Create a league for your friends or browse public leagues to join one.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href="/leagues">Browse public leagues</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {memberships.map((m, i) => {
            const board = boards[i];
            const position = board.rows.findIndex((r) => r.memberId === m.id);
            const row = board.rows[position];
            return (
              <Link key={m.id} href={`/leagues/${m.leagueId}`} className="group">
                <Card className="h-full transition-shadow group-hover:shadow-md">
                  <CardHeader>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {leagueModeLabel(m.league)} · {m.league.tourMode === "MIXED" ? "Mixed tour" : m.league.tourMode}
                    </span>
                    <CardTitle>{m.league.name}</CardTitle>
                    <CardDescription>{m.teamName}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Position</p>
                      <p className="font-display text-3xl font-bold">
                        {position + 1}
                        <span className="text-base text-muted-foreground">/{board.rows.length}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {board.format === "HEAD_TO_HEAD" ? "Record" : "Points"}
                      </p>
                      <p className="font-display text-2xl font-bold tabular-nums">
                        {board.format === "HEAD_TO_HEAD" ? `${row.wins}-${row.losses}` : formatPoints(row.points)}
                      </p>
                    </div>
                  </CardContent>
                  {board.current && !row.hasRoster && board.current.status === "UPCOMING" && (
                    <p className="mx-5 mb-5 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground">
                      Set your roster for {board.current.name}
                    </p>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <section>
        <h2 className="mb-4 font-display text-2xl font-bold uppercase">Live and next up</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {tournaments.map((t) => (
            <Link key={t.id} href={`/tournaments/${t.id}`} className="group">
              <Card className="transition-shadow group-hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CategoryLabel category={t.category} />
                    <StatusBadge status={t.status} />
                  </div>
                  <CardTitle>{t.name}</CardTitle>
                  <CardDescription>
                    {t.location} · {formatDateRange(t.startsAt, t.endsAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <SurfaceBadge surface={t.surface} />
                  <span className="text-xs font-semibold text-muted-foreground">{t.tours.join(" · ")}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
