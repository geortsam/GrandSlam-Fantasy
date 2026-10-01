"use client";

import { useQuery } from "@tanstack/react-query";
import { Crown, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { initials } from "@/lib/flags";
import type { Leaderboard as LeaderboardData, LeaderboardRow } from "@/lib/leagues";
import { cn, formatPoints } from "@/lib/utils";
import { SectionTitle } from "./page-header";
import { LiveBadge } from "./tennis";

const MEDAL = [
  { ring: "ring-gold", text: "text-gold", bg: "from-gold/25", label: "1st" },
  { ring: "ring-silver", text: "text-silver", bg: "from-silver/20", label: "2nd" },
  { ring: "ring-bronze", text: "text-bronze", bg: "from-bronze/20", label: "3rd" },
];

function TeamBadge({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-elevated font-display font-extrabold ring-2 ring-border",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

function Podium({ rows, h2h, myMemberId }: { rows: LeaderboardRow[]; h2h: boolean; myMemberId?: string }) {
  // Display order: 2nd, 1st, 3rd.
  const order = [1, 0, 2].filter((i) => rows[i]);
  return (
    <ol className="mb-6 grid grid-cols-3 items-end gap-2 sm:gap-4" aria-label="Top three">
      {order.map((i) => {
        const r = rows[i];
        const m = MEDAL[i];
        return (
          <li
            key={r.memberId}
            className={cn(
              "relative flex flex-col items-center rounded-xl border bg-gradient-to-b to-card p-3 text-center edge-glow sm:p-4",
              m.bg,
              i === 0 ? "pb-6 pt-6 sm:pb-8" : "",
              r.memberId === myMemberId && "border-primary/60",
            )}
          >
            {i === 0 && <Crown className="absolute -top-3 size-6 fill-gold text-gold" aria-hidden="true" />}
            <TeamBadge name={r.teamName} className={cn("ring-2", m.ring, i === 0 ? "size-14 text-lg" : "size-11 text-sm")} />
            <p className={cn("mt-2 font-display text-sm font-extrabold uppercase", m.text)}>{m.label}</p>
            <p className="w-full truncate text-sm font-bold">{r.teamName}</p>
            <p className="w-full truncate text-xs text-muted-foreground">{r.ownerName}</p>
            <p className="mt-1 font-display text-xl font-extrabold tabular-nums sm:text-2xl">
              {h2h ? `${r.wins}-${r.losses}` : formatPoints(r.points)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

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
  const hasScores = data.rows.some((r) => r.points > 0);

  return (
    <div>
      <SectionTitle
        aside={
          <span className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
            {live && <LiveBadge label="Live scoring" />}
            <RefreshCw className={cn("size-3", isFetching && "animate-spin")} aria-hidden="true" />
            {new Date(dataUpdatedAt).toLocaleTimeString()}
          </span>
        }
      >
        Standings
      </SectionTitle>
      {hasScores && data.rows.length >= 3 && <Podium rows={data.rows} h2h={h2h} myMemberId={myMemberId} />}
      <div className="overflow-hidden rounded-xl border bg-card edge-glow">
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
              <TableHead className="text-right">{data.format === "TOURNAMENT" ? "Points" : "Season"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((r, i) => (
              <TableRow
                key={r.memberId}
                className={cn(r.memberId === myMemberId && "bg-primary/10 hover:bg-primary/15")}
              >
                <TableCell>
                  <span
                    className={cn(
                      "font-display text-xl font-extrabold",
                      i === 0 && "text-gold",
                      i === 1 && "text-silver",
                      i === 2 && "text-bronze",
                    )}
                  >
                    {i + 1}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <TeamBadge name={r.teamName} className="size-9 text-xs" />
                    <div className="min-w-0">
                      <div className="truncate font-bold">
                        {r.teamName}
                        {r.memberId === myMemberId && (
                          <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-primary-foreground">
                            You
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{r.ownerName}</div>
                    </div>
                  </div>
                </TableCell>
                {h2h && (
                  <TableCell className="text-right font-bold tabular-nums">
                    {r.wins}-{r.losses}-{r.ties}
                  </TableCell>
                )}
                {data.current && (
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {r.hasRoster ? (
                      <span className={cn(live && "font-bold text-positive")}>{formatPoints(r.currentPoints)}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No roster</span>
                    )}
                  </TableCell>
                )}
                <TableCell className="text-right font-display text-xl font-extrabold tabular-nums">
                  {formatPoints(r.points)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
