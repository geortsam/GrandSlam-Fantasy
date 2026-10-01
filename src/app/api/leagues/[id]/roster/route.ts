import { NextResponse } from "next/server";
import { handle, requireApiUser } from "@/lib/api";
import { saveRoster, saveRosterSchema } from "@/lib/leagues";

export const PUT = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await params;
  const result = await saveRoster(user.id, id, saveRosterSchema.parse(await req.json()));
  return NextResponse.json(result);
});
