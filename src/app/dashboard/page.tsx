import { ChevronRight, Plus, Ticket, Trophy } from "lucide-react";
import Link from "next/link";
import { LockCountdown } from "@/components/lock-countdown";
import { PageHeader, SectionTitle, StatTile } from "@/components/page-header";
import { CategoryLabel, StatusBadge, SurfaceBadge } from "@/components/tennis";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { leagueModeLabel, tourModeLabel } from "@/lib/labels";
import { getLeaderboard } from "@/lib/leagues";
import { cn, formatDateRange, formatPoints } from "@/lib/utils";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

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
  const rows = memberships.map((m, i) => {
    const position = boards[i].rows.findIndex((r) => r.memberId === m.id);
    return { m, board: boards[i], position, row: boards[i].rows[position] };
  });
  const nextLock = tournaments.find((t) => t.status === "UPCOMING");
  const best = rows.length ? Math.min(...rows.map((r) => r.position + 1)) : null;
  const totalPoints = rows.reduce((s, r) => s + (r.row?.points ?? 0), 0);
  const pending = rows.filter((r) => r.board.current?.status === "UPCOMING" && !r.row?.hasRoster).length;

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Your game"
        title={`Welcome back${user.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/leagues/join">
                <Ticket /> Join league
              </Link>
            </Button>
            <Button asChild>
              <Link href="/leagues/new">
                <Plus /> Create league
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Leagues" value={memberships.length} sub={pending ? `${pending} roster${pending > 1 ? "s" : ""} to set` : "All rosters set"} />
        <StatTile label="Best finish" value={best ? ordinal(best) : "–"} sub="Across your leagues" />
        <StatTile label="Season points" value={formatPoints(totalPoints)} sub="All leagues combined" />
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 edge-glow">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">Next deadline</p>
          {nextLock ? (
            <>
              <p className="mt-1 truncate font-display text-xl font-extrabold uppercase">{nextLock.name}</p>
              <div className="mt-1">
                <LockCountdown startsAt={nextLock.startsAt.toISOString()} />
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">No upcoming tournaments</p>
          )}
        </div>
      </div>

      <section>
        <SectionTitle>My leagues</SectionTitle>
        {memberships.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-start gap-3 pt-6">
              <Trophy className="size-8 text-primary" aria-hidden="true" />
              <p className="font-display text-2xl font-extrabold uppercase">No leagues yet</p>
              <p className="text-muted-foreground">Create a league for your friends or join a public one.</p>
              <Button asChild variant="secondary">
                <Link href="/leagues">Browse public leagues</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map(({ m, board, position, row }) => {
              const needsRoster = board.current?.status === "UPCOMING" && !row.hasRoster;
              return (
                <Link key={m.id} href={`/leagues/${m.leagueId}`} className="group">
                  <Card className="relative h-full overflow-hidden transition-colors group-hover:border-primary/50">
                    <div
                      className={cn(
                        "pointer-events-none absolute -right-10 -top-10 size-40 rounded-full blur-2xl",
                        m.league.tourMode === "ATP" ? "bg-atp/20" : m.league.tourMode === "WTA" ? "bg-wta/20" : "bg-primary/15",
                      )}
                    />
                    <CardContent className="relative space-y-4 pt-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {leagueModeLabel(m.league)} · {tourModeLabel(m.league.tourMode)}
                          </p>
                          <p className="truncate font-display text-2xl font-extrabold uppercase leading-tight">{m.league.name}</p>
                          <p className="truncate text-sm text-muted-foreground">{m.teamName}</p>
                        </div>
                        <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 rounded-lg bg-elevated/70 p-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Rank</p>
                          <p className="font-display text-3xl font-extrabold leading-none">
                            {ordinal(position + 1)}
                            <span className="ml-1 text-sm font-semibold text-muted-foreground">of {board.rows.length}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {board.format === "HEAD_TO_HEAD" ? "Record" : "Points"}
                          </p>
                          <p className="font-display text-3xl font-extrabold leading-none text-primary tabular-nums">
                            {board.format === "HEAD_TO_HEAD" ? `${row.wins}-${row.losses}` : formatPoints(row.points)}
                          </p>
                        </div>
                      </div>
                      {needsRoster ? (
                        <p className="rounded-lg bg-accent px-3 py-2 text-sm font-bold text-accent-foreground">
                          Set your roster for {board.current!.name}
                        </p>
                      ) : board.current ? (
                        <p className="text-xs text-muted-foreground">
                          {board.current.status === "LIVE" ? "Live now: " : "Next: "}
                          <span className="font-semibold text-foreground">{board.current.name}</span>
                          {board.current.status === "LIVE" && ` · ${formatPoints(row.currentPoints)} pts`}
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          aside={
            <Link href="/tournaments" className="text-sm font-bold text-primary hover:underline">
              All tournaments
            </Link>
          }
        >
          Live and next up
        </SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {tournaments.map((t) => (
            <Link key={t.id} href={`/tournaments/${t.id}`} className="group">
              <Card className="overflow-hidden transition-colors group-hover:border-primary/50">
                <div className={`h-1.5 ${t.surface === "CLAY" ? "bg-clay" : t.surface === "GRASS" ? "bg-grass" : "bg-hard"}`} />
                <CardContent className="flex items-center justify-between gap-4 pt-5">
                  <div className="min-w-0 space-y-1">
                    <CategoryLabel category={t.category} />
                    <p className="truncate font-display text-2xl font-extrabold uppercase leading-tight">{t.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.location} · {formatDateRange(t.startsAt, t.endsAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <StatusBadge status={t.status} />
                    <SurfaceBadge surface={t.surface} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
