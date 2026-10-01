import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { getTournamentMatches } from "@/lib/tournaments";

export const dynamic = "force-dynamic";

export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return NextResponse.json({ matches: await getTournamentMatches(id), updatedAt: new Date().toISOString() });
});
