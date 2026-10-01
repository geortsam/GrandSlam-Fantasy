import { ClipboardList, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyInvite } from "@/components/copy-invite";
import { Leaderboard } from "@/components/leaderboard";
import { SectionTitle } from "@/components/page-header";
import { StatusBadge, SurfaceBadge } from "@/components/tennis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { roundRobin } from "@/lib/domain/standings";
import { leagueModeLabel, tourModeLabel } from "@/lib/labels";
import { focusTournament, getLeaderboard, leagueTournaments } from "@/lib/leagues";
import { formatDateRange, formatPoints } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const league = await prisma.league.findUnique({ where: { id }, select: { name: true } });
  return { title: league?.name ?? "League" };
}

export default async function LeaguePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const league = await prisma.league.findUnique({
    where: { id },
    include: { members: { orderBy: { joinedAt: "asc" } }, tournament: true },
  });
  if (!league) notFound();
  const me = user ? league.members.find((m) => m.userId === user.id) : undefined;

  if (league.visibility === "PRIVATE" && !me) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <Lock className="size-6 text-muted-foreground" aria-hidden="true" />
          <CardTitle>This league is private</CardTitle>
          <p className="text-sm text-muted-foreground">Ask the commissioner for an invite link or code.</p>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/leagues/join">Enter a code</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const [board, tournaments] = await Promise.all([getLeaderboard(league.id), leagueTournaments(league)]);
  const current = focusTournament(tournaments);
  const myRosters = me
    ? new Set((await prisma.roster.findMany({ where: { memberId: me.id }, select: { tournamentId: true } })).map((r) => r.tournamentId))
    : new Set<string>();

  // This week's head-to-head pairings.
  let matchups: Array<{ home: string; away: string | null }> = [];
  if (league.mode === "SEASON" && league.seasonFormat === "HEAD_TO_HEAD" && current) {
    const schedule = roundRobin(league.members.map((m) => m.id));
    const week = tournaments.filter((t) => t.status !== "UPCOMING").indexOf(current);
    const index = week >= 0 ? week : tournaments.filter((t) => t.status !== "UPCOMING").length;
    matchups = schedule.length ? schedule[index % schedule.length] : [];
  }
  const rowOf = new Map(board.rows.map((r) => [r.memberId, r]));

  return (
    <div className="space-y-8">
      <div className="relative flex flex-wrap items-end justify-between gap-4 overflow-hidden rounded-2xl border bg-card p-6 edge-glow md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            {leagueModeLabel(league)} · {tourModeLabel(league.tourMode)} · ${league.salaryCap}M cap ·{" "}
            {league.visibility === "PUBLIC" ? "Public" : "Private"}
          </p>
          <h1 className="mt-1 font-display text-4xl font-extrabold uppercase italic leading-none md:text-5xl">{league.name}</h1>
          <p className="mt-2 text-muted-foreground">
            {me ? <span className="font-semibold text-foreground">{me.teamName}</span> : null}
            {me ? " · " : ""}
            {league.members.length} managers
          </p>
        </div>
        {me && current && current.status !== "COMPLETED" && (
          <Button asChild size="lg" className="relative h-auto min-h-11 whitespace-normal py-2 text-left" variant={current.status === "UPCOMING" ? "default" : "outline"}>
            <Link href={`/leagues/${league.id}/roster?t=${current.id}`}>
              <ClipboardList /> {current.status === "UPCOMING" ? "Set roster" : "View roster"} · {current.name}
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <Leaderboard leagueId={league.id} initial={board} myMemberId={me?.id} />

          {matchups.length > 0 && current && (
            <section>
              <SectionTitle>Matchups · {current.name}</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                {matchups.map(({ home, away }) => {
                  const h = rowOf.get(home);
                  const a = away ? rowOf.get(away) : undefined;
                  return (
                    <Card key={`${home}-${away}`}>
                      <CardContent className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 pt-5 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{h?.teamName}</p>
                          <p className="font-display text-3xl font-extrabold tabular-nums">{formatPoints(h?.currentPoints ?? 0)}</p>
                        </div>
                        <span className="rounded-full bg-primary px-2 py-1 font-display text-xs font-extrabold text-primary-foreground">VS</span>
                        <div className="min-w-0 text-right">
                          <p className="truncate font-semibold">{a?.teamName ?? "Bye"}</p>
                          <p className="font-display text-3xl font-extrabold tabular-nums">{a ? formatPoints(a.currentPoints) : "–"}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          {me && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg font-extrabold uppercase">Invite friends</CardTitle>
              </CardHeader>
              <CardContent>
                <CopyInvite code={league.inviteCode} />
                {league.passcodeHash && (
                  <p className="mt-2 text-xs text-muted-foreground">Joiners also need the league passcode.</p>
                )}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg font-extrabold uppercase">Tournaments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-2 pt-0">
              {tournaments.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 rounded-md px-3 py-2 hover:bg-muted">
                  <div className="min-w-0">
                    <Link href={me ? `/leagues/${league.id}/roster?t=${t.id}` : `/tournaments/${t.id}`} className="block truncate text-sm font-semibold hover:underline">
                      {t.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{formatDateRange(t.startsAt, t.endsAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <SurfaceBadge surface={t.surface} />
                    {me && t.status === "UPCOMING" && !myRosters.has(t.id) ? (
                      <span className="text-xs font-semibold text-accent">Needs roster</span>
                    ) : (
                      <StatusBadge status={t.status} />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
