// Plain domain types shared by the pure game logic. They mirror the Prisma
// enums as string unions so the logic can be unit-tested without a database.

export type Tour = "ATP" | "WTA";
export type TourMode = Tour | "MIXED";
export type Surface = "HARD" | "CLAY" | "GRASS";
export type SlotType = "STARTER" | "CAPTAIN" | "BENCH";
export type LeagueMode = "TOURNAMENT" | "SEASON";
export type SeasonFormat = "HEAD_TO_HEAD" | "POINTS";
