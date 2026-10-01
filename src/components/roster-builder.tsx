"use client";

import { useMutation } from "@tanstack/react-query";
import { Search, Shuffle, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Court } from "./court";
import { PlayerAvatar } from "./player-avatar";
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

  const ofSlot = (slot: SlotType) => picks.filter((p) => p.slot === slot);
  const tourOf = (p: Pick) => byId.get(p.playerId)?.tour ?? "ATP";
  // Mixed lineups put ATP on the left of the net and WTA on the right.
  const starters = mixed ? arrangeByTour(ofSlot("STARTER"), tourOf, 2) : ofSlot("STARTER");
  const captains = mixed ? arrangeByTour(ofSlot("CAPTAIN"), tourOf, 1) : ofSlot("CAPTAIN");
  const bench = ofSlot("BENCH");
  const slotProps = { byId, locked, onRemove: remove, onMove: move };

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
          <h1 className="mt-1 font-display text-4xl font-extrabold uppercase italic leading-none md:text-5xl">
            {tournament.name} <span className="text-primary">lineup</span>
          </h1>
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

      <Card className="surface-glass sticky top-[6.75rem] z-30 md:top-[4.5rem]">
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
            <p className="font-display text-3xl font-extrabold tabular-nums text-primary">{formatPoints(totalPoints)} pts</p>
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

      <div className="space-y-6">
        <section aria-label="Your lineup">
          <Court surface={tournament.surface} className="border edge-glow">
            <div className="grid grid-cols-3 gap-2 p-3 sm:gap-4 sm:p-6 md:px-[10%] md:py-10">
              <div className="grid place-items-center gap-3 sm:gap-6">
                {[0, 1].map((i) => (
                  <CourtSlot key={i} slot="STARTER" pick={starters[i]} hint={mixed ? "ATP starter" : "Starter"} {...slotProps} />
                ))}
              </div>
              <div className="grid place-items-center content-center gap-3 sm:gap-6">
                {[0, 1].map((i) => (
                  <CourtSlot
                    key={i}
                    slot="CAPTAIN"
                    pick={captains[i]}
                    hint={mixed ? (i === 0 ? "ATP captain" : "WTA captain") : "Captain"}
                    {...slotProps}
                  />
                ))}
              </div>
              <div className="grid place-items-center gap-3 sm:gap-6">
                {[2, 3].map((i) => (
                  <CourtSlot key={i} slot="STARTER" pick={starters[i]} hint={mixed ? "WTA starter" : "Starter"} {...slotProps} />
                ))}
              </div>
            </div>
          </Court>
          <div className="mt-3 rounded-xl border border-dashed bg-card/60 p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Bench · scores 0 unless moved into the lineup before the lock
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(2,10.5rem)]">
              {[0, 1].map((i) => (
                <CourtSlot key={i} slot="BENCH" pick={bench[i]} hint="Bench" {...slotProps} />
              ))}
            </div>
          </div>
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
                        <div className="flex items-center gap-3">
                          <PlayerAvatar name={p.name} tour={p.tour} country={p.country} size="sm" />
                          <div className="min-w-0">
                            <p className={cn("truncate font-semibold", p.eliminated && "text-muted-foreground line-through")}>{p.name}</p>
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <TourBadge tour={p.tour} /> #{p.rank} · {p.country}
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
                                  variant={
                                    !affordable || count(slot) >= ROSTER_SHAPE[slot]
                                      ? "outline"
                                      : slot === "CAPTAIN"
                                        ? "accent"
                                        : slot === "STARTER"
                                          ? "default"
                                          : "secondary"
                                  }
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

function CourtSlot({
  slot,
  pick,
  hint,
  byId,
  locked,
  onRemove,
  onMove,
}: {
  slot: SlotType;
  pick?: Pick;
  hint: string;
  byId: Map<string, BuilderPlayer>;
  locked: boolean;
  onRemove: (id: string) => void;
  onMove: (id: string, slot: SlotType) => void;
}) {
  const player = pick ? byId.get(pick.playerId) : undefined;
  if (!pick || !player) {
    return (
      <div className="flex min-h-[5.5rem] w-full max-w-[10.5rem] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-white/40 bg-black/20 p-2 text-center text-white/90">
        <span className="flex size-9 items-center justify-center rounded-full border-2 border-dashed border-white/50 text-lg font-bold" aria-hidden="true">
          +
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider">{hint}</span>
      </div>
    );
  }
  const surname = player.name.split(" ").slice(-1)[0];
  return (
    <div
      className={cn(
        "relative flex min-h-[5.5rem] w-full max-w-[10.5rem] flex-col items-center gap-1 rounded-xl border bg-background/85 p-2 text-center shadow-lg backdrop-blur",
        slot === "CAPTAIN" ? "border-primary shadow-glow" : "border-white/15",
        player.eliminated && "opacity-60",
      )}
    >
      {slot === "CAPTAIN" && (
        <span className="absolute -left-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-primary font-display text-xs font-extrabold text-primary-foreground" title="Captain, 1.5x points">
          C
        </span>
      )}
      {!locked && (
        <button
          type="button"
          onClick={() => onRemove(player.id)}
          aria-label={`Remove ${player.name}`}
          className="absolute right-1 top-1 rounded-full p-1 text-muted-foreground hover:bg-elevated hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
      <PlayerAvatar name={player.name} tour={player.tour} country={player.country} size="md" />
      <p className={cn("w-full truncate text-xs font-bold sm:text-sm", player.eliminated && "line-through")} title={player.name}>
        <span className="sm:hidden">{surname}</span>
        <span className="hidden sm:inline">{player.name}</span>
      </p>
      <p className="text-[11px] font-semibold text-muted-foreground">
        {locked ? (
          <span className="font-bold text-primary">{formatPoints(player.points * slotMultiplier(slot))} pts</span>
        ) : (
          formatSalary(pick.salary)
        )}
      </p>
      {!locked && (
        <select
          aria-label={`Move ${player.name}`}
          value={slot}
          onChange={(e) => onMove(player.id, e.target.value as SlotType)}
          className="mt-0.5 h-6 w-full max-w-[7rem] rounded-md border border-input bg-elevated px-1 text-[11px] font-semibold"
        >
          <option value="CAPTAIN">Captain</option>
          <option value="STARTER">Starter</option>
          <option value="BENCH">Bench</option>
        </select>
      )}
    </div>
  );
}

/**
 * Places picks into fixed positions: `perTour` ATP spots, then `perTour` WTA
 * spots. Extra picks of one tour (mid-edit) fill whatever spots are left.
 */
function arrangeByTour(picks: Pick[], tourOf: (p: Pick) => Tour, perTour: number): (Pick | undefined)[] {
  const out: (Pick | undefined)[] = Array(perTour * 2).fill(undefined);
  const overflow: Pick[] = [];
  for (const p of picks) {
    const base = tourOf(p) === "ATP" ? 0 : perTour;
    const free = [...Array(perTour).keys()].map((i) => base + i).find((i) => !out[i]);
    if (free === undefined) overflow.push(p);
    else out[free] = p;
  }
  for (const p of overflow) {
    const free = out.findIndex((x) => !x);
    if (free >= 0) out[free] = p;
  }
  return out;
}
