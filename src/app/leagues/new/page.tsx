import { CreateLeagueForm } from "@/components/create-league-form";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata = { title: "Create league" };
export const dynamic = "force-dynamic";

export default async function NewLeaguePage() {
  await requireUser("/leagues/new");
  const tournaments = await prisma.tournament.findMany({
    where: { status: "UPCOMING" },
    orderBy: { startsAt: "asc" },
    select: { id: true, name: true, tours: true, startsAt: true, category: true },
  });
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-4xl font-extrabold uppercase italic leading-none md:text-5xl">Create a league</h1>
      <CreateLeagueForm
        tournaments={tournaments.map((t) => ({ ...t, startsAt: t.startsAt.toISOString() }))}
      />
    </div>
  );
}
