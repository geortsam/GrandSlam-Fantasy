import { describe, expect, it } from "vitest";
import { computeSalary, formScore, SALARY } from "@/lib/domain/salary";

describe("computeSalary", () => {
  it("prices world No. 1 near the max and deep ranks near the min", () => {
    expect(computeSalary(1, "")).toBe(SALARY.max);
    expect(computeSalary(200, "")).toBe(SALARY.min);
  });

  it("falls as rank gets worse", () => {
    const prices = [1, 5, 10, 25, 50].map((r) => computeSalary(r, ""));
    expect([...prices].sort((a, b) => b - a)).toEqual(prices);
  });

  it("rises with hot form and drops with cold form", () => {
    expect(computeSalary(20, "WWWWWWWWWW")).toBeGreaterThan(computeSalary(20, ""));
    expect(computeSalary(20, "LLLLLLLLLL")).toBeLessThan(computeSalary(20, ""));
  });

  it("rounds to the nearest half million and stays in range", () => {
    for (let r = 1; r < 300; r += 7) {
      const s = computeSalary(r, "WLWLW");
      expect(s * 2).toBe(Math.round(s * 2));
      expect(s).toBeGreaterThanOrEqual(SALARY.min);
      expect(s).toBeLessThanOrEqual(SALARY.max);
    }
  });
});

describe("formScore", () => {
  it("counts wins minus losses over the last 10", () => {
    expect(formScore("WWL")).toBe(1);
    expect(formScore("WWWWWWWWWWLLLLL")).toBe(10);
    expect(formScore("")).toBe(0);
  });
});
