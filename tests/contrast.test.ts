// WCAG AA contrast check for the design tokens in globals.css.
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(__dirname, "../src/app/globals.css"), "utf8");

function block(selector: string): Map<string, [number, number, number]> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("}", start));
  const tokens = new Map<string, [number, number, number]>();
  for (const m of body.matchAll(/--([\w-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%;/g)) {
    tokens.set(m[1], [Number(m[2]), Number(m[3]), Number(m[4])]);
  }
  return tokens;
}

function luminance([h, s, l]: [number, number, number]): number {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(f(0)) + 0.7152 * lin(f(8)) + 0.0722 * lin(f(4));
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const PAIRS: Array<[string, string]> = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["muted-foreground", "muted"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["accent-foreground", "accent"],
  ["destructive-foreground", "destructive"],
  ["grass-foreground", "grass"],
  ["hard-foreground", "hard"],
  ["clay-foreground", "clay"],
  ["live-foreground", "live"],
  ["positive", "card"],
  ["negative", "card"],
  ["atp", "card"],
  ["wta", "card"],
  ["primary", "card"],
  ["accent", "card"],
  ["live", "card"],
  ["muted-foreground", "elevated"],
  ["foreground", "elevated"],
  ["gold", "card"],
  ["silver", "card"],
  ["bronze", "card"],
  ["primary", "background"],
];

describe.each([":root", ".light"])("%s tokens meet WCAG AA", (selector) => {
  const tokens = block(selector);
  it.each(PAIRS)("%s on %s is at least 4.5:1", (fg, bg) => {
    expect(tokens.get(fg), fg).toBeDefined();
    expect(tokens.get(bg), bg).toBeDefined();
    expect(contrast(tokens.get(fg)!, tokens.get(bg)!)).toBeGreaterThanOrEqual(4.5);
  });
});
