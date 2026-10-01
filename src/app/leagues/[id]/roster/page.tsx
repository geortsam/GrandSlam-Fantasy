import Link from "next/link";
import { redirect } from "next/navigation";
import { RosterBuilder } from "@/components/roster-builder";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getRosterBuilder } from "@/lib/leagues";

export const metadata = { title: "Roster" };
export const dynamic = "force-dynamic";

export default async function RosterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;
  const user = await requireUser(`/leagues/${id}/roster${t ? `?t=${t}` : ""}`);
  const data = await getRosterBuilder(user.id, id, t);
  if (!data) redirect(`/leagues/${id}`);
  if (!data.tournament) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>No tournament to set a roster for</CardTitle>
          <Link href={`/leagues/${id}`} className="text-sm text-primary underline">
            Back to league
          </Link>
        </CardHeader>
      </Card>
    );
  }
  const { league, tournament } = data;
  return (
    <RosterBuilder
      league={{ id: league.id, name: league.name, salaryCap: league.salaryCap, mode: league.mode }}
      tournament={{
        id: tournament.id,
        name: tournament.name,
        surface: tournament.surface,
        status: tournament.status,
        startsAt: tournament.startsAt.toISOString(),
      }}
      tournaments={data.tournaments.map((x) => ({ id: x.id, name: x.name, status: x.status }))}
      allowedTours={[...data.allowedTours]}
      players={[...data.players]}
      initialPicks={[...data.picks]}
      carriedOver={data.carriedOver}
    />
  );
}
