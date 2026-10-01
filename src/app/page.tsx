import { ArrowRight, Crown, Gauge, Swords, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CategoryLabel, StatusBadge, SurfaceBadge } from "@/components/tennis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SCORING, UPSET_TIERS } from "@/lib/domain/scoring";
import { formatDateRange } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (await getCurrentUser()) redirect("/dashboard");
  const tournaments = await prisma.tournament.findMany({
    where: { status: { in: ["LIVE", "UPCOMING"] } },
    orderBy: { startsAt: "asc" },
    take: 3,
  });

  return (
    <div className="space-y-14">
      <section className="court-lines relative overflow-hidden rounded-2xl bg-primary px-6 py-14 text-primary-foreground md:px-12 md:py-20">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.2em]">ATP · WTA · Mixed</p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold uppercase leading-none md:text-6xl">
          Draft the tours. Own the Slams.
        </h1>
        <p className="mt-4 max-w-xl text-base md:text-lg">
          Build an 8-player roster under the salary cap, name two captains, and score from every ace, break and
          upset in real time.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" variant="accent">
            <Link href="/signin">
              Start playing <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
            <Link href="/tournaments">See live tournaments</Link>
          </Button>
        </div>
      </section>

      {tournaments.length > 0 && (
        <section aria-labelledby="on-court">
          <h2 id="on-court" className="mb-4 font-display text-2xl font-bold uppercase">
            On court now
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {tournaments.map((t) => (
              <Link key={t.id} href={`/tournaments/${t.id}`} className="group">
                <Card className="h-full transition-shadow group-hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CategoryLabel category={t.category} />
                      <StatusBadge status={t.status} />
                    </div>
                    <CardTitle>{t.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t.location} · {formatDateRange(t.startsAt, t.endsAt)}
                    </p>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <SurfaceBadge surface={t.surface} />
                    {t.tours.map((tour) => (
                      <span key={tour} className="text-xs font-semibold text-muted-foreground">
                        {tour}
                      </span>
                    ))}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-4" aria-label="Features">
        {[
          { icon: Gauge, title: "Salary cap draft", body: "Prices move with ranking and form. Spend $100M on 8 players." },
          { icon: Crown, title: "Two captains", body: `Captains score ${SCORING.captainMultiplier}x. Choose before the lock.` },
          { icon: Swords, title: "Head-to-head", body: "Season-long H2H or total points, public or private." },
          { icon: Users, title: "Mixed tour", body: "Two ATP and two WTA starters at combined events." },
        ].map((f) => (
          <Card key={f.title}>
            <CardHeader>
              <f.icon className="size-6 text-accent" aria-hidden="true" />
              <CardTitle>{f.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{f.body}</p>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section aria-labelledby="scoring">
        <h2 id="scoring" className="mb-4 font-display text-2xl font-bold uppercase">
          Scoring
        </h2>
        <Card>
          <CardContent className="grid gap-x-8 gap-y-2 pt-5 text-sm sm:grid-cols-2">
            <ScoreLine label="Match won" value={`+${SCORING.matchWon}`} />
            <ScoreLine label="Straight-sets win" value={`+${SCORING.straightSetsBonus}`} />
            <ScoreLine label="Ace" value={`+${SCORING.ace}`} />
            <ScoreLine label="Double fault" value={`${SCORING.doubleFault}`} />
            <ScoreLine label="Break point converted" value={`+${SCORING.breakPointConverted}`} />
            {UPSET_TIERS.map((t) => (
              <ScoreLine key={t.label} label={`Beat a seed ${t.maxSeed <= 4 ? "1–4" : `≤${t.maxSeed}`} (upset)`} value={`+${t.bonus}`} />
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ScoreLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b py-1.5 last:border-0">
      <span>{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
