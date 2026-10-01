import Link from "next/link";
import { CategoryLabel, StatusBadge, SurfaceBadge } from "@/components/tennis";
import { TourToggle } from "@/components/tour-toggle";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { currentSeason } from "@/lib/sync";
import { formatDateRange } from "@/lib/utils";

export const metadata = { title: "Tournaments" };
export const dynamic = "force-dynamic";

export default async function TournamentsPage({ searchParams }: { searchParams: Promise<{ tour?: string }> }) {
  const { tour: tourParam } = await searchParams;
  const tour = tourParam === "ATP" || tourParam === "WTA" ? tourParam : "ALL";
  const tournaments = await prisma.tournament.findMany({
    where: { season: currentSeason(), ...(tour !== "ALL" ? { tours: { has: tour } } : {}) },
    orderBy: { startsAt: "asc" },
  });
  const groups = [
    { title: "Live now", items: tournaments.filter((t) => t.status === "LIVE") },
    { title: "Upcoming", items: tournaments.filter((t) => t.status === "UPCOMING") },
    { title: "Completed", items: tournaments.filter((t) => t.status === "COMPLETED").reverse() },
  ];
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase">{currentSeason()} Tournaments</h1>
          <p className="text-muted-foreground">Grand Slams and Masters 1000 events.</p>
        </div>
        <TourToggle value={tour} />
      </div>
      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <section key={g.title}>
              <h2 className="mb-3 font-display text-xl font-bold uppercase">{g.title}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((t) => (
                  <Link key={t.id} href={`/tournaments/${t.id}`} className="group">
                    <Card className="h-full transition-shadow group-hover:shadow-md">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CategoryLabel category={t.category} />
                          <StatusBadge status={t.status} />
                        </div>
                        <CardTitle>{t.name}</CardTitle>
                        <CardDescription>
                          {t.location} · {formatDateRange(t.startsAt, t.endsAt)}
                        </CardDescription>
                        <div className="flex items-center gap-2 pt-1">
                          <SurfaceBadge surface={t.surface} />
                          <span className="text-xs font-semibold text-muted-foreground">{t.tours.join(" · ")}</span>
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ),
      )}
    </div>
  );
}
