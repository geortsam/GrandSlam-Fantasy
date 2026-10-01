import { NextResponse } from "next/server";
import { handle, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { createLeague, createLeagueSchema } from "@/lib/leagues";

export const GET = handle(async () => {
  const leagues = await prisma.league.findMany({
    where: { visibility: "PUBLIC" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      mode: true,
      seasonFormat: true,
      tourMode: true,
      maxMembers: true,
      inviteCode: true,
      _count: { select: { members: true } },
    },
  });
  return NextResponse.json({ leagues });
});

export const POST = handle(async (req: Request) => {
  const user = await requireApiUser();
  const input = createLeagueSchema.parse(await req.json());
  const league = await createLeague(user.id, input);
  return NextResponse.json({ id: league.id, inviteCode: league.inviteCode }, { status: 201 });
});
