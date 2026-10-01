import { describe, expect, it } from "vitest";
import { MockTennisProvider } from "@/lib/tennis/mock-provider";

const at = (iso: string) => new MockTennisProvider(() => new Date(iso));

describe("MockTennisProvider", () => {
  it("returns ranked players for both tours", async () => {
    const p = at("2026-10-01T12:00:00Z");
    const atp = await p.getRankings("ATP");
    const wta = await p.getRankings("WTA");
    expect(atp).toHaveLength(48);
    expect(wta).toHaveLength(48);
    expect(atp[0].rank).toBe(1);
    expect(new Set(atp.map((x) => x.externalId)).size).toBe(48);
  });

  it("derives tournament status from the clock", async () => {
    const list = await at("2026-10-01T12:00:00Z").getTournaments(2026);
    const status = Object.fromEntries(list.map((t) => [t.name, t.status]));
    expect(status["US Open"]).toBe("COMPLETED");
    expect(status["Rolex Shanghai Masters"]).toBe("LIVE");
    expect(status["Rolex Paris Masters"]).toBe("UPCOMING");
  });

  it("plays a full, consistent 32-player draw to a single champion", async () => {
    const p = at("2026-12-01T00:00:00Z");
    const matches = await p.getMatches("mock-2026-us-open");
    const atp = matches.filter((m) => m.tour === "ATP");
    expect(atp).toHaveLength(31);
    expect(atp.every((m) => m.status === "COMPLETED" || m.status === "RETIRED")).toBe(true);
    expect(atp.filter((m) => m.status === "COMPLETED").every((m) => m.bestOf === 5)).toBe(true);
    const final = atp.find((m) => m.round === 5)!;
    const entries = await p.getEntries("mock-2026-us-open");
    const alive = entries.filter((e) => e.tour === "ATP" && !e.eliminated);
    expect(alive.map((e) => e.playerExternalId)).toEqual([final.winnerExternalId]);
    expect(entries.filter((e) => e.tour === "ATP" && e.seed != null)).toHaveLength(16);
  });

  it("is deterministic", async () => {
    const a = await at("2026-09-20T00:00:00Z").getMatches("mock-2026-us-open");
    const b = await at("2026-09-20T00:00:00Z").getMatches("mock-2026-us-open");
    expect(a).toEqual(b);
  });

  it("reveals later rounds only after the feeder matches finish", async () => {
    const opening = await at("2026-10-05T11:30:00Z").getMatches("mock-2026-wuhan");
    expect(opening.every((m) => m.round === 1)).toBe(true);
    expect(opening.some((m) => m.status === "LIVE")).toBe(true);
    const upcoming = await at("2026-10-04T00:00:00Z").getMatches("mock-2026-wuhan");
    expect(upcoming.every((m) => m.status === "SCHEDULED" && m.score.length === 0)).toBe(true);
  });

  it("only grows live stats as a match progresses", async () => {
    const id = "mock-2026-wuhan-wta-r1-m1";
    const times = ["2026-10-05T10:50:00Z", "2026-10-05T11:30:00Z", "2026-10-05T12:30:00Z", "2026-10-05T13:00:00Z"];
    const snaps = [];
    for (const t of times) snaps.push((await at(t).getMatches("mock-2026-wuhan")).find((m) => m.externalId === id)!);
    for (let i = 1; i < snaps.length; i++) {
      expect(snaps[i].stats[0].aces).toBeGreaterThanOrEqual(snaps[i - 1].stats[0].aces);
      expect(snaps[i].score.length).toBeGreaterThanOrEqual(snaps[i - 1].score.length);
    }
    expect(snaps[3].winnerExternalId).not.toBeNull();
  });
});
