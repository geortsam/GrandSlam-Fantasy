import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLeaderboard, ServiceError } from "@/lib/leagues";

export const dynamic = "force-dynamic";

export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const league = await prisma.league.findUnique({ where: { id }, select: { visibility: true } });
  if (!league) throw new ServiceError("League not found.", 404);
  if (league.visibility === "PRIVATE") {
    const user = await getCurrentUser();
    const member = user
      ? await prisma.leagueMember.findUnique({ where: { leagueId_userId: { leagueId: id, userId: user.id } } })
      : null;
    if (!member) throw new ServiceError("This league is private.", 403);
  }
  return NextResponse.json(await getLeaderboard(id), { headers: { "Cache-Control": "no-store" } });
});
