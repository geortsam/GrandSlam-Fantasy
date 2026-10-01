// Tennis data provider contract. The app only talks to this interface, so the
// mock provider and real APIs (Sportradar, RapidAPI) are interchangeable.
import type { Surface, Tour } from "@/lib/domain/types";

export type TournamentCategory = "GRAND_SLAM" | "MASTERS_1000";
export type TournamentStatus = "UPCOMING" | "LIVE" | "COMPLETED";
export type MatchStatus = "SCHEDULED" | "LIVE" | "COMPLETED" | "RETIRED" | "WALKOVER";

export interface ProviderPlayer {
  externalId: string;
  name: string;
  tour: Tour;
  country: string;
  rank: number;
  rankPoints: number;
  hardWinPct: number;
  clayWinPct: number;
  grassWinPct: number;
  seasonWins: number;
  seasonLosses: number;
  /** Most recent result first, e.g. "WWLWL". */
  recentForm: string;
}

export interface ProviderTournament {
  externalId: string;
  name: string;
  category: TournamentCategory;
  surface: Surface;
  tours: Tour[];
  location: string;
  season: number;
  startsAt: Date;
  endsAt: Date;
  status: TournamentStatus;
}

export interface ProviderEntry {
  playerExternalId: string;
  tour: Tour;
  seed: number | null;
  eliminated: boolean;
}

export interface ProviderMatchStat {
  playerExternalId: string;
  side: "A" | "B";
  aces: number;
  doubleFaults: number;
  breakPointsConverted: number;
  setsWon: number;
  setsLost: number;
}

export interface ProviderMatch {
  externalId: string;
  tour: Tour;
  round: number;
  roundName: string;
  status: MatchStatus;
  scheduledAt: Date;
  bestOf: 3 | 5;
  winnerExternalId: string | null;
  /** Completed set scores from side A's perspective. */
  score: Array<[number, number]>;
  stats: [ProviderMatchStat, ProviderMatchStat];
}

export interface TennisDataProvider {
  readonly name: string;
  getRankings(tour: Tour): Promise<ProviderPlayer[]>;
  getTournaments(season: number): Promise<ProviderTournament[]>;
  getEntries(tournamentExternalId: string): Promise<ProviderEntry[]>;
  getMatches(tournamentExternalId: string): Promise<ProviderMatch[]>;
}
