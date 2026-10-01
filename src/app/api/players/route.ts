import { NextResponse } from "next/server";
import { z } from "zod";
import { handle } from "@/lib/api";
import { prisma } from "@/lib/db";

const query = z.object({
  tour: z.enum(["ATP", "WTA", "ALL"]).default("ALL"),
  q: z.string().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const GET = handle(async (req: Request) => {
  const params = query.parse(Object.fromEntries(new URL(req.url).searchParams));
  const players = await prisma.player.findMany({
    where: {
      ...(params.tour !== "ALL" ? { tour: params.tour } : {}),
      ...(params.q ? { name: { contains: params.q, mode: "insensitive" as const } } : {}),
    },
    orderBy: [{ tour: "asc" }, { rank: "asc" }],
    take: params.limit,
  });
  return NextResponse.json({ players });
});
