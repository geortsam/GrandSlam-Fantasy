"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Leaderboard as LeaderboardData } from "@/lib/leagues";
import { cn, formatPoints } from "@/lib/utils";
import { LiveBadge } from "./tennis";

export function Leaderboard({
  leagueId,
  initial,
  myMemberId,
}: {
  leagueId: string;
  initial: LeaderboardData;
  myMemberId?: string;
}) {
  const { data, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["leaderboard", leagueId],
    queryFn: async () => {
      const res = await fetch(`/api/leagues/${leagueId}/leaderboard`);
      if (!res.ok) throw new Error("Failed to load leaderboard");
      return (await res.json()) as LeaderboardData;
    },
    initialData: initial,
    // Poll fast while a tournament is live, slowly otherwise.
    refetchInterval: (q) => (q.state.data?.current?.status === "LIVE" ? 15_000 : 120_000),
  });

  const live = data.current?.status === "LIVE";
  const h2h = data.format === "HEAD_TO_HEAD";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl font-bold uppercase">Leaderboard</h2>
          {live && <LiveBadge label="Live scoring" />}
        </div>
        <span className="flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
          <RefreshCw className={cn("size-3", isFetching && "animate-spin")} aria-hidden="true" />
          Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
        </span>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Team</TableHead>
              {h2h && <TableHead className="text-right">W-L-T</TableHead>}
              {data.current && (
                <TableHead className="hidden text-right sm:table-cell">
                  <span className="sr-only">Points at </span>
                  {data.current.name}
                </TableHead>
              )}
              <TableHead className="text-right">{data.format === "TOURNAMENT" ? "Points" : "Season pts"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((r, i) => (
              <TableRow key={r.memberId} className={cn(r.memberId === myMemberId && "bg-primary/5")}>
                <TableCell className="font-display text-lg font-bold">{i + 1}</TableCell>
                <TableCell>
                  <div className="font-semibold">
                    {r.teamName}
                    {r.memberId === myMemberId && <span className="ml-2 text-xs font-medium text-primary">You</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{r.ownerName}</div>
                </TableCell>
                {h2h && (
                  <TableCell className="text-right font-semibold tabular-nums">
                    {r.wins}-{r.losses}-{r.ties}
                  </TableCell>
                )}
                {data.current && (
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {r.hasRoster ? formatPoints(r.currentPoints) : <span className="text-xs text-muted-foreground">No roster</span>}
                  </TableCell>
                )}
                <TableCell className="text-right font-display text-lg font-bold tabular-nums">{formatPoints(r.points)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
