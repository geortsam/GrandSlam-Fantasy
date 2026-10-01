import { NextResponse } from "next/server";
import { handle, requireApiUser } from "@/lib/api";
import { joinLeague, joinLeagueSchema } from "@/lib/leagues";

export const POST = handle(async (req: Request) => {
  const user = await requireApiUser();
  const league = await joinLeague(user.id, joinLeagueSchema.parse(await req.json()));
  return NextResponse.json({ id: league.id });
});
