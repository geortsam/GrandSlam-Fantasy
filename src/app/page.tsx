import { ArrowRight, Crown, Gauge, Radio, Swords, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CourtPerspective } from "@/components/court";
import { SectionTitle } from "@/components/page-header";
import { PlayerAvatar } from "@/components/player-avatar";
import { CategoryLabel, StatusBadge, SurfaceBadge } from "@/components/tennis";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SCORING, UPSET_TIERS } from "@/lib/domain/scoring";
import { formatDateRange, formatSalary } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (await getCurrentUser()) redirect("/dashboard");
  const [tournaments, stars, counts] = await Promise.all([
    prisma.tournament.findMany({
      where: { status: { in: ["LIVE", "UPCOMING"] } },
      orderBy: { startsAt: "asc" },
      take: 3,
    }),
    prisma.player.findMany({ where: { rank: { lte: 2 } }, orderBy: [{ tour: "asc" }, { rank: "asc" }] }),
    Promise.all([prisma.player.count(), prisma.tournament.count(), prisma.league.count({ where: { visibility: "PUBLIC" } })]),
  ]);

  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-14 edge-glow md:px-12 md:py-20">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 size-96 rounded-full bg-secondary/20 blur-3xl" />
        <CourtPerspective className="pointer-events-none absolute -right-10 bottom-0 hidden w-[55%] opacity-60 lg:block" />
        <div className="relative max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            <Radio className="size-3.5" aria-hidden="true" /> 2026 season live
          </p>
          <h1 className="mt-5 font-display text-5xl font-extrabold uppercase italic leading-[0.9] tracking-tight md:text-7xl">
            Draft the tours.
            <br />
            <span className="text-gradient">Own the Slams.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Build an 8-player ATP and WTA roster under the salary cap, name two captains, and score from every ace,
            break and upset in real time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signin">
                Play for free <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/tournaments">Live scores</Link>
            </Button>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
            {[
              { label: "Players", value: counts[0] },
              { label: "Tournaments", value: counts[1] },
              { label: "Public leagues", value: counts[2] },
            ].map((s) => (
              <div key={s.label}>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</dt>
                <dd className="font-display text-3xl font-extrabold">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        {stars.length > 0 && (
          <div className="relative mt-10 flex flex-wrap gap-3 lg:absolute lg:right-12 lg:top-14 lg:mt-0 lg:w-72 lg:flex-col">
            {stars.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/70 p-3 backdrop-blur">
                <PlayerAvatar name={p.name} tour={p.tour} country={p.country} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.tour} No. {p.rank}
                  </p>
                </div>
                <span className="rounded-md bg-primary/15 px-2 py-1 text-xs font-bold text-primary">{formatSalary(p.salary)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {tournaments.length > 0 && (
        <section aria-labelledby="on-court">
          <SectionTitle>On court now</SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            {tournaments.map((t) => (
              <Link key={t.id} href={`/tournaments/${t.id}`} className="group">
                <Card className="h-full overflow-hidden transition-colors group-hover:border-primary/50">
                  <div className={`h-1.5 ${t.surface === "CLAY" ? "bg-clay" : t.surface === "GRASS" ? "bg-grass" : "bg-hard"}`} />
                  <CardContent className="space-y-2 pt-5">
                    <div className="flex items-center justify-between gap-2">
                      <CategoryLabel category={t.category} />
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="font-display text-2xl font-extrabold uppercase leading-tight">{t.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.location} · {formatDateRange(t.startsAt, t.endsAt)}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <SurfaceBadge surface={t.surface} />
                      <span className="text-xs font-bold text-muted-foreground">{t.tours.join(" · ")}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="how" className="space-y-4">
        <SectionTitle>How it works</SectionTitle>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { icon: Gauge, title: "Salary cap draft", body: "Prices move with ranking and form. Spend $100M on 8 players." },
            { icon: Crown, title: "Two captains", body: `Captains score ${SCORING.captainMultiplier}x. Choose them before the lock.` },
            { icon: Swords, title: "Head-to-head", body: "Season-long H2H or total points, in public or private leagues." },
            { icon: Users, title: "Mixed tour", body: "Two ATP and two WTA starters at combined events." },
          ].map((f, i) => (
            <Card key={f.title} className="relative overflow-hidden">
              <span className="absolute right-4 top-2 font-display text-6xl font-extrabold text-foreground/5" aria-hidden="true">
                0{i + 1}
              </span>
              <CardContent className="space-y-2 pt-5">
                <f.icon className="size-6 text-primary" aria-hidden="true" />
                <p className="font-display text-2xl font-extrabold uppercase">{f.title}</p>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="scoring">
        <SectionTitle>Scoring</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Match won", value: `+${SCORING.matchWon}` },
            { label: "Straight sets", value: `+${SCORING.straightSetsBonus}` },
            { label: "Ace", value: `+${SCORING.ace}` },
            { label: "Double fault", value: `${SCORING.doubleFault}` },
            { label: "Break converted", value: `+${SCORING.breakPointConverted}` },
            ...UPSET_TIERS.map((t) => ({
              label: `Upset · seed ${t.maxSeed <= 4 ? "1–4" : `≤${t.maxSeed}`}`,
              value: `+${t.bonus}`,
            })),
            { label: "Captain", value: `${SCORING.captainMultiplier}x` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-card p-4 edge-glow">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className={`font-display text-3xl font-extrabold ${s.value.startsWith("-") ? "text-negative" : "text-primary"}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
