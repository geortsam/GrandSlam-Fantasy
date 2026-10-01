import { Plus, Ticket } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { leagueModeLabel, tourModeLabel } from "@/lib/labels";

export const metadata = { title: "Leagues" };
export const dynamic = "force-dynamic";

export default async function LeaguesPage() {
  const leagues = await prisma.league.findMany({
    where: { visibility: "PUBLIC" },
    include: { _count: { select: { members: true } }, tournament: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase">Public leagues</h1>
          <p className="text-muted-foreground">Open to anyone. Private leagues need an invite link or code.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/leagues/join">
              <Ticket /> Join with code
            </Link>
          </Button>
          <Button asChild>
            <Link href="/leagues/new">
              <Plus /> Create league
            </Link>
          </Button>
        </div>
      </div>
      {leagues.length === 0 ? (
        <p className="text-muted-foreground">No public leagues yet. Create the first one.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {leagues.map((l) => {
            const full = l._count.members >= l.maxMembers;
            return (
              <Card key={l.id} className="flex flex-col">
                <CardHeader>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {leagueModeLabel(l)} · {tourModeLabel(l.tourMode)}
                  </span>
                  <CardTitle>{l.name}</CardTitle>
                  <CardDescription>
                    {l.tournament ? `${l.tournament.name} · ` : ""}
                    {l._count.members}/{l.maxMembers} managers · ${l.salaryCap}M cap
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/leagues/${l.id}`}>View</Link>
                  </Button>
                  {!full && (
                    <Button asChild size="sm">
                      <Link href={`/join/${l.inviteCode}`}>Join</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
