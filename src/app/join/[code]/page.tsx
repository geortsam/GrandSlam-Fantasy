import { notFound, redirect } from "next/navigation";
import { JoinLeagueForm } from "@/components/join-league-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { leagueModeLabel, tourModeLabel } from "@/lib/labels";

export const metadata = { title: "Join league" };
export const dynamic = "force-dynamic";

/** Invite links: /join/ABCD2345 */
export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await requireUser(`/join/${code}`);
  const league = await prisma.league.findUnique({
    where: { inviteCode: code.toUpperCase() },
    include: { _count: { select: { members: true } }, members: { where: { userId: user.id } } },
  });
  if (!league) notFound();
  if (league.members.length > 0) redirect(`/leagues/${league.id}`);
  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {leagueModeLabel(league)} · {tourModeLabel(league.tourMode)}
          </span>
          <CardTitle className="text-2xl">You&apos;re invited to {league.name}</CardTitle>
          <CardDescription>
            {league._count.members}/{league.maxMembers} managers · ${league.salaryCap}M salary cap
          </CardDescription>
        </CardHeader>
      </Card>
      <JoinLeagueForm inviteCode={league.inviteCode} needsPasscode={!!league.passcodeHash} />
    </div>
  );
}
