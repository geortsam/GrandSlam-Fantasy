export function leagueModeLabel(l: { mode: string; seasonFormat: string }): string {
  if (l.mode === "TOURNAMENT") return "Tournament";
  return l.seasonFormat === "HEAD_TO_HEAD" ? "Season · Head-to-head" : "Season · Points";
}

export function tourModeLabel(t: string): string {
  return t === "MIXED" ? "Mixed tour" : t;
}
