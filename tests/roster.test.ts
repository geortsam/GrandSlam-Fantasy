import { describe, expect, it } from "vitest";
import { eligibleTours, validateRoster, type PlayerInfo, type RosterPick } from "@/lib/domain/roster";
import type { Tour } from "@/lib/domain/types";

function pool(): Map<string, PlayerInfo> {
  const m = new Map<string, PlayerInfo>();
  for (const tour of ["ATP", "WTA"] as Tour[]) {
    for (let i = 1; i <= 8; i++) {
      const id = `${tour}${i}`;
      m.set(id, { id, tour, salary: 10, entered: true });
    }
  }
  return m;
}

const mixedRoster: RosterPick[] = [
  { playerId: "ATP1", slot: "STARTER" },
  { playerId: "ATP2", slot: "STARTER" },
  { playerId: "WTA1", slot: "STARTER" },
  { playerId: "WTA2", slot: "STARTER" },
  { playerId: "ATP3", slot: "CAPTAIN" },
  { playerId: "WTA3", slot: "CAPTAIN" },
  { playerId: "ATP4", slot: "BENCH" },
  { playerId: "WTA4", slot: "BENCH" },
];

const atpRoster: RosterPick[] = mixedRoster.map((p, i) => ({ ...p, playerId: `ATP${i + 1}` }));

describe("validateRoster", () => {
  it("accepts a balanced mixed roster under the cap", () => {
    const r = validateRoster(mixedRoster, pool(), { allowedTours: ["ATP", "WTA"], salaryCap: 100 });
    expect(r).toEqual({ ok: true, errors: [], totalSalary: 80 });
  });

  it("accepts a tour-specific roster", () => {
    expect(validateRoster(atpRoster, pool(), { allowedTours: ["ATP"], salaryCap: 100 }).ok).toBe(true);
  });

  it("rejects rosters over the salary cap", () => {
    const r = validateRoster(mixedRoster, pool(), { allowedTours: ["ATP", "WTA"], salaryCap: 79.5 });
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/over the \$79.5M cap/);
  });

  it("enforces 4 starters, 2 captains and 2 bench", () => {
    const picks = mixedRoster.map((p) => (p.playerId === "ATP4" ? { ...p, slot: "CAPTAIN" as const } : p));
    const r = validateRoster(picks, pool(), { allowedTours: ["ATP", "WTA"], salaryCap: 100 });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("captain"))).toBe(true);
  });

  it("requires 2 ATP and 2 WTA starters plus one captain per tour in mixed play", () => {
    const picks = mixedRoster.map((p) => (p.playerId === "WTA2" ? { ...p, playerId: "ATP5" } : p));
    const r = validateRoster(picks, pool(), { allowedTours: ["ATP", "WTA"], salaryCap: 100 });
    expect(r.errors).toContain("Mixed rosters start 2 ATP and 2 WTA players.");
  });

  it("rejects players from the wrong tour, players not in the draw, and duplicates", () => {
    const players = pool();
    players.set("ATP8", { ...players.get("ATP8")!, entered: false });
    const wrongTour = validateRoster(mixedRoster, players, { allowedTours: ["ATP"], salaryCap: 100 });
    expect(wrongTour.errors.join()).toMatch(/Only ATP players/);

    const notEntered = atpRoster.map((p, i) => (i === 7 ? { ...p, playerId: "ATP8" } : p));
    expect(validateRoster(notEntered, players, { allowedTours: ["ATP"], salaryCap: 100 }).errors.join()).toMatch(
      /draw/,
    );

    const dupes = atpRoster.map((p, i) => (i === 7 ? { ...p, playerId: "ATP1" } : p));
    expect(validateRoster(dupes, players, { allowedTours: ["ATP"], salaryCap: 100 }).errors.join()).toMatch(
      /only appear once/,
    );
  });
});

describe("eligibleTours", () => {
  it("intersects league tours with the tournament's draws", () => {
    expect(eligibleTours("MIXED", ["ATP", "WTA"])).toEqual(["ATP", "WTA"]);
    expect(eligibleTours("MIXED", ["ATP"])).toEqual(["ATP"]);
    expect(eligibleTours("WTA", ["ATP"])).toEqual([]);
  });
});

describe("autoPick", () => {
  it("builds valid rosters for mixed and single-tour play", async () => {
    const { autoPick } = await import("@/lib/domain/autopick");
    const players: PlayerInfo[] = [];
    for (const tour of ["ATP", "WTA"] as Tour[]) {
      for (let i = 1; i <= 20; i++) players.push({ id: `${tour}${i}`, tour, salary: Math.max(4, 30 - (i - 1) * 1.5), entered: true });
    }
    const info = new Map(players.map((p) => [p.id, p]));
    for (const allowed of [["ATP", "WTA"], ["WTA"]] as Tour[][]) {
      for (let i = 0; i < 20; i++) {
        const picks = autoPick(players, allowed, 100);
        expect(picks).not.toBeNull();
        expect(validateRoster(picks!, info, { allowedTours: allowed, salaryCap: 100 }).ok).toBe(true);
      }
    }
  });
});
