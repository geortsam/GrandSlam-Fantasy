import { NextResponse } from "next/server";
import { handle, isAuthorizedCron } from "@/lib/api";
import { nightlySync } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Nightly ranking, salary, calendar and upcoming-draw sync. */
export const GET = handle(async (req: Request) => {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await nightlySync());
});
