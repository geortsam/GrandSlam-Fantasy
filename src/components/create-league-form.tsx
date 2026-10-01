"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FormError, readError } from "./form-error";

interface TournamentOption {
  id: string;
  name: string;
  tours: string[];
  startsAt: string;
}

function Choice({
  name,
  value,
  current,
  onChange,
  title,
  description,
}: {
  name: string;
  value: string;
  current: string;
  onChange: (v: string) => void;
  title: string;
  description: string;
}) {
  const checked = value === current;
  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col gap-1 rounded-md border p-3 transition-colors",
        checked ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted",
      )}
    >
      <input type="radio" className="sr-only" name={name} value={value} checked={checked} onChange={() => onChange(value)} />
      <span className="font-semibold">{title}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </label>
  );
}

export function CreateLeagueForm({ tournaments }: { tournaments: TournamentOption[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    teamName: "",
    mode: "SEASON",
    seasonFormat: "POINTS",
    tourMode: "MIXED",
    visibility: "PRIVATE",
    passcode: "",
    tournamentId: "",
    maxMembers: 12,
    salaryCap: 100,
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const eligible = useMemo(
    () =>
      tournaments.filter((t) =>
        form.tourMode === "MIXED" ? t.tours.length > 0 : t.tours.includes(form.tourMode),
      ),
    [tournaments, form.tourMode],
  );

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, tournamentId: form.mode === "TOURNAMENT" ? form.tournamentId : undefined }),
      });
      if (!res.ok) throw await readError(res);
      return (await res.json()) as { id: string };
    },
    onSuccess: ({ id }) => router.push(`/leagues/${id}`),
  });
  const err = create.error as { error?: string; details?: string[] } | null;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">League name</Label>
            <Input id="name" required minLength={3} maxLength={60} value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teamName">Your team name</Label>
            <Input id="teamName" required minLength={2} maxLength={40} value={form.teamName} onChange={(e) => set("teamName", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold">Game mode</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <Choice name="mode" value="SEASON" current={form.mode} onChange={(v) => set("mode", v)} title="Season-long" description="Set a roster for every Grand Slam and Masters 1000 all year." />
          <Choice name="mode" value="TOURNAMENT" current={form.mode} onChange={(v) => set("mode", v)} title="Single tournament" description="Draft 8 players for one upcoming event." />
        </div>
      </fieldset>

      {form.mode === "SEASON" ? (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">Scoring format</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <Choice name="seasonFormat" value="POINTS" current={form.seasonFormat} onChange={(v) => set("seasonFormat", v)} title="Points only" description="Highest season total wins." />
            <Choice name="seasonFormat" value="HEAD_TO_HEAD" current={form.seasonFormat} onChange={(v) => set("seasonFormat", v)} title="Head-to-head" description="Face one manager per tournament; best record wins." />
          </div>
        </fieldset>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold">Tour</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <Choice name="tourMode" value="MIXED" current={form.tourMode} onChange={(v) => set("tourMode", v)} title="Mixed" description="2 ATP + 2 WTA starters at combined events." />
          <Choice name="tourMode" value="ATP" current={form.tourMode} onChange={(v) => set("tourMode", v)} title="ATP" description="Men's tour only." />
          <Choice name="tourMode" value="WTA" current={form.tourMode} onChange={(v) => set("tourMode", v)} title="WTA" description="Women's tour only." />
        </div>
      </fieldset>

      {form.mode === "TOURNAMENT" && (
        <div className="space-y-2">
          <Label htmlFor="tournamentId">Tournament</Label>
          <Select id="tournamentId" required value={form.tournamentId} onChange={(e) => set("tournamentId", e.target.value)}>
            <option value="">Choose an upcoming tournament</option>
            {eligible.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.tours.join(" & ")}) · starts {new Date(t.startsAt).toLocaleDateString()}
              </option>
            ))}
          </Select>
        </div>
      )}

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold">Who can join</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <Choice name="visibility" value="PRIVATE" current={form.visibility} onChange={(v) => set("visibility", v)} title="Private" description="Invite link or code only." />
          <Choice name="visibility" value="PUBLIC" current={form.visibility} onChange={(v) => set("visibility", v)} title="Public" description="Listed for anyone to join." />
        </div>
      </fieldset>

      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="passcode">Passcode (optional)</Label>
            <Input id="passcode" type="text" autoComplete="off" minLength={4} maxLength={32} value={form.passcode} onChange={(e) => set("passcode", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxMembers">Max managers</Label>
            <Input id="maxMembers" type="number" min={2} max={50} value={form.maxMembers} onChange={(e) => set("maxMembers", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salaryCap">Salary cap ($M)</Label>
            <Input id="salaryCap" type="number" min={60} max={200} step={5} value={form.salaryCap} onChange={(e) => set("salaryCap", Number(e.target.value))} />
          </div>
        </CardContent>
      </Card>

      <FormError error={err?.error} details={err?.details} />
      <Button type="submit" size="lg" disabled={create.isPending}>
        {create.isPending ? "Creating…" : "Create league"}
      </Button>
    </form>
  );
}
