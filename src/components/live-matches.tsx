"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { LiveMatch, LiveMatchPlayer } from "@/lib/tournaments";
import { cn, formatPoints } from "@/lib/utils";
import { LiveBadge } from "./tennis";

export function LiveMatches({
  tournamentId,
  tours,
  live,
  initial,
}: {
  tournamentId: string;
  tours: string[];
  live: boolean;
  initial: LiveMatch[];
}) {
  const [tour, setTour] = useState(tours[0]);
  const { data } = useQuery({
    queryKey: ["matches", tournamentId],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches`);
      if (!res.ok) throw new Error("Failed to load matches");
      return ((await res.json()) as { matches: LiveMatch[] }).matches;
    },
    initialData: initial,
    refetchInterval: live ? 15_000 : false,
  });

  const matches = data.filter((m) => m.tour === tour);
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => b - a);

  if (data.length === 0) {
    return <p className="text-muted-foreground">The draw hasn&apos;t been published yet.</p>;
  }

  return (
    <div className="space-y-6">
      {tours.length > 1 && (
        <div role="group" aria-label="Tour" className="inline-flex rounded-full border bg-card p-1">
          {tours.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tour === t}
              onClick={() => setTour(t)}
              className={cn(
                "rounded-full px-5 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground",
                tour === t && "bg-primary text-primary-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      {rounds.map((round) => {
        const inRound = matches
          .filter((m) => m.round === round)
          .sort((a, b) => Number(b.status === "LIVE") - Number(a.status === "LIVE"));
        return (
          <section key={round}>
            <h2 className="mb-3 font-display text-2xl font-extrabold uppercase">{inRound[0]?.roundName}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {inRound.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function MatchCard({ match }: { match: LiveMatch }) {
  const isLive = match.status === "LIVE";
  const scheduled = match.status === "SCHEDULED";
  return (
    <Card className={cn("overflow-hidden", isLive && "border-live/60 ring-1 ring-live/40")}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {isLive ? (
            <LiveBadge />
          ) : scheduled ? (
            <span>
              {new Date(match.scheduledAt).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : (
            <span className="font-semibold">{match.status === "RETIRED" ? "Final · Ret." : "Final"}</span>
          )}
          <span>Fantasy pts</span>
        </div>
        {match.players.map((p, i) => (
          <PlayerLine key={p.id} player={p} sets={match.score.map((s) => s[i])} opp={match.score.map((s) => s[1 - i])} />
        ))}
      </CardContent>
    </Card>
  );
}

function PlayerLine({ player, sets, opp }: { player: LiveMatchPlayer; sets: number[]; opp: number[] }) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm", player.winner ? "font-bold" : "font-medium")}>
          {player.seed && <span className="mr-1 text-xs text-muted-foreground">[{player.seed}]</span>}
          {player.name}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {player.aces} aces · {player.doubleFaults} DF · {player.breakPointsConverted} BP won
        </p>
      </div>
      <div className="flex gap-1 tabular-nums" aria-label={`Sets: ${sets.join(", ") || "none"}`}>
        {sets.map((g, i) => (
          <span key={i} className={cn("w-6 rounded text-center font-display text-lg leading-6", g > opp[i] ? "bg-elevated font-extrabold" : "text-muted-foreground")}>
            {g}
          </span>
        ))}
      </div>
      <span
        className={cn(
          "w-12 text-right text-sm font-bold tabular-nums",
          player.fantasyPoints < 0 ? "text-negative" : "text-positive",
        )}
      >
        {formatPoints(player.fantasyPoints)}
      </span>
    </div>
  );
}
