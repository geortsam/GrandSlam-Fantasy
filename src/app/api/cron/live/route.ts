import { NextResponse } from "next/server";
import { handle, isAuthorizedCron } from "@/lib/api";
import { pollLiveScores } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Live score poll: run every minute while tournaments are in play. */
export const GET = handle(async (req: Request) => {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await pollLiveScores());
});
