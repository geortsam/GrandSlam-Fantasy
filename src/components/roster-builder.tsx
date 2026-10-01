"use client";

import { useMutation } from "@tanstack/react-query";
import { Crown, Search, Shuffle, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { autoPick } from "@/lib/domain/autopick";
import { isLocked } from "@/lib/domain/lock";
import { ROSTER_SHAPE, validateRoster, type PlayerInfo } from "@/lib/domain/roster";
import { slotMultiplier } from "@/lib/domain/scoring";
import type { SlotType, Tour } from "@/lib/domain/types";
import { cn, formatPoints, formatSalary } from "@/lib/utils";
import { FormError, readError } from "./form-error";
import { LockCountdown } from "./lock-countdown";
import { FormGuide, StatusBadge, SurfaceBadge, TourBadge } from "./tennis";

export interface BuilderPlayer {
  id: string;
  name: string;
  tour: Tour;
  country: string;
  rank: number;
  seed: number | null;
  salary: number;
  eliminated: boolean;
  recentForm: string;
  surfacePct: number;
  points: number;
}

interface Pick {
  playerId: string;
  slot: SlotType;
  salary: number;
}

const SLOT_LABEL: Record<SlotType, string> = { CAPTAIN: "Captains · 1.5x", STARTER: "Starters", BENCH: "Bench" };
const SLOT_ORDER: SlotType[] = ["CAPTAIN", "STARTER", "BENCH"];

export function RosterBuilder({
  league,
  tournament,
  tournaments,
  allowedTours,
  players,
  initialPicks,
  carriedOver,
}: {
  league: { id: string; name: string; salaryCap: number; mode: string };
  tournament: { id: string; name: string; surface: string; status: string; startsAt: string };
  tournaments: Array<{ id: string; name: string; status: string }>;
  allowedTours: Tour[];
  players: BuilderPlayer[];
  initialPicks: Pick[];
  carriedOver: boolean;
}) {
  const router = useRouter();
  const [picks, setPicks] = useState<Pick[]>(initialPicks);
  const [locked, setLocked] = useState(() => isLocked(new Date(tournament.startsAt)));
  const [tourFilter, setTourFilter] = useState<"ALL" | Tour>("ALL");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"rank" | "salary" | "points" | "surface">("rank");
  const [saved, setSaved] = useState(!carriedOver && initialPicks.length > 0);
  const onLock = useCallback(() => setLocked(true), []);

  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const info = useMemo(() => {
    const m = new Map<string, PlayerInfo>();
    for (const p of players) m.set(p.id, { id: p.id, tour: p.tour, salary: p.salary, entered: true });
    // Picks keep the price they were bought at.
    for (const pk of picks) {
      const base = m.get(pk.playerId);
      if (base) m.set(pk.playerId, { ...base, salary: pk.salary });
    }
    return m;
  }, [players, picks]);

  const validation = validateRoster(picks, info, { allowedTours, salaryCap: league.salaryCap });
  const spent = validation.totalSalary;
  const remaining = Math.round((league.salaryCap - spent) * 10) / 10;
  const pickedIds = new Set(picks.map((p) => p.playerId));
  const count = (slot: SlotType) => picks.filter((p) => p.slot === slot).length;
  const mixed = allowedTours.length === 2;

  const totalPoints = picks.reduce((sum, p) => sum + (byId.get(p.playerId)?.points ?? 0) * slotMultiplier(p.slot), 0);

  const add = (player: BuilderPlayer, slot: SlotType) => {
    setSaved(false);
    setPicks((cur) => [...cur.filter((p) => p.playerId !== player.id), { playerId: player.id, slot, salary: player.salary }]);
  };
  const remove = (id: string) => {
    setSaved(false);
    setPicks((cur) => cur.filter((p) => p.playerId !== id));
  };
  const move = (id: string, slot: SlotType) => {
    setSaved(false);
    setPicks((cur) => cur.map((p) => (p.playerId === id ? { ...p, slot } : p)));
  };

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/leagues/${league.id}/roster`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tournamentId: tournament.id, picks: picks.map(({ playerId, slot }) => ({ playerId, slot })) }),
      });
      if (!res.ok) throw await readError(res);
      return res.json();
    },
    onSuccess: () => {
      setSaved(true);
      router.refresh();
    },
  });
  const saveErr = save.error as { error?: string; details?: string[] } | null;

  const pool = players
    .filter((p) => tourFilter === "ALL" || p.tour === tourFilter)
    .filter((p) => !query || p.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) =>
      sort === "salary"
        ? b.salary - a.salary
        : sort === "points"
          ? b.points - a.points
          : sort === "surface"
            ? b.surfacePct - a.surfacePct
            : a.rank - b.rank || a.tour.localeCompare(b.tour),
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/leagues/${league.id}`} className="text-sm text-muted-foreground hover:underline">
            ← {league.name}
          </Link>
          <h1 className="font-display text-3xl font-bold uppercase">{tournament.name} roster</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <SurfaceBadge surface={tournament.surface} />
            <StatusBadge status={tournament.status} />
            {mixed ? (
              <span className="text-xs text-muted-foreground">2 ATP + 2 WTA starters, one captain per tour</span>
            ) : (
              <span className="text-xs text-muted-foreground">{allowedTours[0]} players only</span>
            )}
          </div>
        </div>
        {tournaments.length > 1 && (
          <Select
            aria-label="Choose tournament"
            className="w-auto"
            value={tournament.id}
            onChange={(e) => router.push(`/leagues/${league.id}/roster?t=${e.target.value}`)}
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.status === "LIVE" ? " (live)" : t.status === "COMPLETED" ? " (final)" : ""}
              </option>
            ))}
          </Select>
        )}
      </div>

      <Card className="sticky top-[6.5rem] z-30 md:top-16">
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4">
          <LockCountdown startsAt={tournament.startsAt} onLock={onLock} />
          <div className="min-w-[200px] flex-1">
            <div className="flex justify-between text-xs font-semibold">
              <span>
                {formatSalary(spent)} of {formatSalary(league.salaryCap)}
              </span>
              <span className={remaining < 0 ? "text-negative" : "text-muted-foreground"}>
                {formatSalary(remaining)} left
              </span>
            </div>
            <div
              className="mt-1 h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Salary cap used"
              aria-valuemin={0}
              aria-valuemax={league.salaryCap}
              aria-valuenow={spent}
            >
              <div
                className={cn("h-full rounded-full", remaining < 0 ? "bg-destructive" : "bg-primary")}
                style={{ width: `${Math.min(100, (spent / league.salaryCap) * 100)}%` }}
              />
            </div>
          </div>
          {locked ? (
            <p className="font-display text-2xl font-bold tabular-nums">{formatPoints(totalPoints)} pts</p>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const auto = autoPick(
                    players.filter((p) => !p.eliminated).map((p) => ({ id: p.id, tour: p.tour, salary: p.salary, entered: true })),
                    allowedTours,
                    league.salaryCap,
                  );
                  if (auto) {
                    setSaved(false);
                    setPicks(auto.map((a) => ({ ...a, salary: byId.get(a.playerId)!.salary })));
                  }
                }}
              >
                <Shuffle /> Auto-pick
              </Button>
              <Button variant="ghost" size="sm" onClick={() => (setPicks([]), setSaved(false))} disabled={picks.length === 0}>
                <Trash2 /> Clear
              </Button>
              <Button size="sm" onClick={() => save.mutate()} disabled={!validation.ok || save.isPending || saved}>
                {save.isPending ? "Saving…" : saved ? "Saved" : "Save roster"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {carriedOver && !saved && !locked && (
        <p className="rounded-md bg-muted p-3 text-sm">
          We carried over your last roster for players in this draw. Review it and save to confirm.
        </p>
      )}
      <FormError error={saveErr?.error} details={saveErr?.details} />
      {!locked && picks.length > 0 && !validation.ok && (
        <ul className="space-y-1 text-sm text-muted-foreground" aria-live="polite">
          {validation.errors.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section aria-label="Your roster" className="min-w-0 space-y-4">
          {SLOT_ORDER.map((slot) => (
            <Card key={slot}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-1.5">
                    {slot === "CAPTAIN" && <Crown className="size-4 text-accent" aria-hidden="true" />}
                    {SLOT_LABEL[slot]}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {count(slot)}/{ROSTER_SHAPE[slot]}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {picks
                  .filter((p) => p.slot === slot)
                  .map((pk) => {
                    const p = byId.get(pk.playerId);
                    if (!p) return null;
                    return (
                      <div key={pk.playerId} className="flex items-center gap-2 rounded-md border p-2">
                        <TourBadge tour={p.tour} />
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-sm font-semibold", p.eliminated && "line-through decoration-2")}>{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatSalary(pk.salary)}
                            {locked && ` · ${formatPoints(p.points * slotMultiplier(slot))} pts`}
                          </p>
                        </div>
                        {!locked && (
                          <>
                            <Select
                              aria-label={`Move ${p.name}`}
                              className="h-8 w-[6.5rem] px-2 text-xs"
                              value={slot}
                              onChange={(e) => move(p.id, e.target.value as SlotType)}
                            >
                              <option value="CAPTAIN">Captain</option>
                              <option value="STARTER">Starter</option>
                              <option value="BENCH">Bench</option>
                            </Select>
                            <Button variant="ghost" size="icon" className="size-8" aria-label={`Remove ${p.name}`} onClick={() => remove(p.id)}>
                              <X />
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                {Array.from({ length: Math.max(0, ROSTER_SHAPE[slot] - count(slot)) }).map((_, i) => (
                  <div key={i} className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                    Empty {slot.toLowerCase()} slot
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </section>

        <section aria-label="Player pool" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input aria-label="Search players" placeholder="Search players" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            {mixed && (
              <div role="group" aria-label="Tour filter" className="inline-flex rounded-md bg-muted p-1">
                {(["ALL", "ATP", "WTA"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={tourFilter === t}
                    onClick={() => setTourFilter(t)}
                    className={cn(
                      "rounded-sm px-3 py-1 text-sm font-semibold text-muted-foreground",
                      tourFilter === t && "bg-card text-foreground shadow-sm",
                    )}
                  >
                    {t === "ALL" ? "Both" : t}
                  </button>
                ))}
              </div>
            )}
            <Select aria-label="Sort players" className="w-auto" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="rank">Sort: Rank</option>
              <option value="salary">Sort: Salary</option>
              <option value="surface">Sort: Surface win %</option>
              <option value="points">Sort: Fantasy points</option>
            </Select>
          </div>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="hidden md:table-cell">Form</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">{tournament.surface.toLowerCase()} %</TableHead>
                  <TableHead className="text-right">Pts</TableHead>
                  <TableHead className="text-right">Salary</TableHead>
                  {!locked && <TableHead className="text-right">Add</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pool.map((p) => {
                  const picked = pickedIds.has(p.id);
                  const affordable = p.salary <= remaining || picked;
                  return (
                    <TableRow key={p.id} className={cn(picked && "bg-primary/5")}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TourBadge tour={p.tour} />
                          <div className="min-w-0">
                            <p className={cn("truncate font-semibold", p.eliminated && "text-muted-foreground line-through")}>{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              #{p.rank} · {p.country}
                              {p.seed ? ` · Seed ${p.seed}` : ""}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <FormGuide form={p.recentForm} />
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">{Math.round(p.surfacePct * 100)}%</TableCell>
                      <TableCell className="text-right tabular-nums">{formatPoints(p.points)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatSalary(p.salary)}</TableCell>
                      {!locked && (
                        <TableCell className="text-right">
                          {picked ? (
                            <Button variant="ghost" size="sm" onClick={() => remove(p.id)}>
                              Remove
                            </Button>
                          ) : (
                            <div className="flex justify-end gap-1">
                              {SLOT_ORDER.map((slot) => (
                                <Button
                                  key={slot}
                                  variant={slot === "CAPTAIN" ? "accent" : slot === "STARTER" ? "default" : "outline"}
                                  size="sm"
                                  className="h-8 px-2 text-xs"
                                  disabled={!affordable || count(slot) >= ROSTER_SHAPE[slot]}
                                  aria-label={`Add ${p.name} as ${slot.toLowerCase()}`}
                                  onClick={() => add(p, slot)}
                                >
                                  {slot === "CAPTAIN" ? "C" : slot === "STARTER" ? "S" : "B"}
                                </Button>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {!locked && (
            <p className="mt-2 text-xs text-muted-foreground">C = captain (1.5x), S = starter, B = bench (scores 0 unless moved up before the lock).</p>
          )}
        </section>
      </div>
    </div>
  );
}
