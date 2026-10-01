import { describe, expect, it } from "vitest";
import { scoreMatch, slotMultiplier, upsetBonus, type MatchLine } from "@/lib/domain/scoring";

const base: MatchLine = {
  won: true,
  completed: true,
  setsWon: 2,
  setsLost: 1,
  aces: 0,
  doubleFaults: 0,
  breakPointsConverted: 0,
  seed: null,
  opponentSeed: null,
};

describe("scoreMatch", () => {
  it("awards +10 for a win", () => {
    expect(scoreMatch(base).total).toBe(10);
  });

  it("adds the +5 straight-sets bonus only when no set was dropped", () => {
    expect(scoreMatch({ ...base, setsLost: 0 }).straightSets).toBe(5);
    expect(scoreMatch({ ...base, setsLost: 0 }).total).toBe(15);
    expect(scoreMatch(base).straightSets).toBe(0);
  });

  it("does not give the straight-sets bonus for a retirement", () => {
    expect(scoreMatch({ ...base, setsWon: 1, setsLost: 0, completedByRetirement: true }).straightSets).toBe(0);
  });

  it("scores aces, double faults and break points", () => {
    const r = scoreMatch({ ...base, won: false, aces: 9, doubleFaults: 3, breakPointsConverted: 2 });
    expect(r.aces).toBe(4.5);
    expect(r.doubleFaults).toBe(-1.5);
    expect(r.breakPoints).toBe(4);
    expect(r.total).toBe(7);
  });

  it("scores running stats while a match is live but holds win bonuses", () => {
    const r = scoreMatch({ ...base, completed: false, setsLost: 0, aces: 4, opponentSeed: 1 });
    expect(r.matchWon).toBe(0);
    expect(r.straightSets).toBe(0);
    expect(r.upset).toBe(0);
    expect(r.total).toBe(2);
  });

  it("adds the upset bonus for beating a better seed", () => {
    expect(scoreMatch({ ...base, seed: 12, opponentSeed: 3 }).upset).toBe(10);
    expect(scoreMatch({ ...base, seed: 3, opponentSeed: 12 }).upset).toBe(0);
  });
});

describe("upsetBonus tiers", () => {
  it.each([
    [null, 1, 10],
    [null, 4, 10],
    [null, 5, 7],
    [9, 8, 7],
    [null, 16, 5],
    [null, 20, 3],
    [null, 33, 0],
    [5, null, 0],
    [2, 2, 0],
  ])("seed %s beating seed %s earns %s", (seed, opp, bonus) => {
    expect(upsetBonus(seed, opp)).toBe(bonus);
  });
});

describe("slotMultiplier", () => {
  it("gives captains 1.5x, starters 1x and bench 0", () => {
    expect(slotMultiplier("CAPTAIN")).toBe(1.5);
    expect(slotMultiplier("STARTER")).toBe(1);
    expect(slotMultiplier("BENCH")).toBe(0);
  });
});
