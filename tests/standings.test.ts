import { describe, expect, it } from "vitest";
import { headToHeadStandings, pointsStandings, rosterPoints, roundRobin } from "@/lib/domain/standings";
import { countdown, isLocked } from "@/lib/domain/lock";

describe("rosterPoints", () => {
  it("applies captain and bench multipliers", () => {
    const pts = new Map([
      ["a", 20],
      ["b", 10],
      ["c", 50],
    ]);
    const total = rosterPoints(
      [
        { playerId: "a", slot: "STARTER" },
        { playerId: "b", slot: "CAPTAIN" },
        { playerId: "c", slot: "BENCH" },
      ],
      pts,
    );
    expect(total).toBe(35);
  });
});

describe("roundRobin", () => {
  it("pairs every member with every other member exactly once", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const seen = new Set<string>();
    for (const round of roundRobin(ids)) {
      for (const { home, away } of round) {
        if (!away) continue;
        const key = [home, away].sort().join("-");
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
    expect(seen.size).toBe((5 * 4) / 2);
  });
});

describe("standings", () => {
  const weeks = [
    { points: new Map([["a", 50], ["b", 40], ["c", 10], ["d", 5]]), final: true },
    { points: new Map([["a", 0], ["b", 70], ["c", 30], ["d", 20]]), final: true },
    { points: new Map([["a", 99], ["b", 0], ["c", 0], ["d", 0]]), final: false },
  ];

  it("ranks points leagues by total, tracking live points separately", () => {
    const rows = pointsStandings(["a", "b", "c", "d"], weeks);
    expect(rows.map((r) => r.memberId)).toEqual(["a", "b", "c", "d"]);
    expect(rows[0]).toMatchObject({ points: 149, livePoints: 99 });
  });

  it("only counts finished weeks toward the head-to-head record", () => {
    const rows = headToHeadStandings(["a", "b", "c", "d"], weeks);
    const games = rows.reduce((n, r) => n + r.wins + r.losses + r.ties, 0);
    expect(games).toBe(2 * 2 * 2); // 2 final weeks, 2 matchups each, 2 teams per matchup
  });
});

describe("lockout", () => {
  const start = new Date("2026-10-05T10:00:00Z");
  it("locks at the start time", () => {
    expect(isLocked(start, new Date("2026-10-05T09:59:59Z"))).toBe(false);
    expect(isLocked(start, start)).toBe(true);
  });
  it("counts down to the lock", () => {
    expect(countdown(start, new Date("2026-10-03T08:30:15Z"))).toEqual({
      locked: false,
      days: 2,
      hours: 1,
      minutes: 29,
      seconds: 45,
    });
    expect(countdown(start, new Date("2026-10-06T00:00:00Z")).locked).toBe(true);
  });
});
