import { notFound } from "next/navigation";
import { LiveMatches } from "@/components/live-matches";
import { CategoryLabel, StatusBadge, SurfaceBadge } from "@/components/tennis";
import { prisma } from "@/lib/db";
import { getTournamentMatches } from "@/lib/tournaments";
import { formatDateRange } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await prisma.tournament.findUnique({ where: { id }, select: { name: true } });
  return { title: t?.name ?? "Tournament" };
}

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) notFound();
  const matches = await getTournamentMatches(id);
  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <CategoryLabel category={tournament.category} />
          <StatusBadge status={tournament.status} />
          <SurfaceBadge surface={tournament.surface} />
        </div>
        <h1 className="mt-1 font-display text-3xl font-bold uppercase md:text-4xl">{tournament.name}</h1>
        <p className="text-muted-foreground">
          {tournament.location} · {formatDateRange(tournament.startsAt, tournament.endsAt)}
        </p>
      </div>
      <LiveMatches
        tournamentId={tournament.id}
        tours={tournament.tours}
        live={tournament.status === "LIVE"}
        initial={matches}
      />
    </div>
  );
}
