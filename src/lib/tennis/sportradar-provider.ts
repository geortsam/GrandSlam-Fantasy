// Sportradar Tennis v3 adapter. Field mapping follows Sportradar's published
// v3 schema (rankings, seasons, season summaries). It has not been exercised
// against a live key in this repo: verify against your plan's docs before
// relying on it, and keep TENNIS_PROVIDER=mock until then.
import type { Surface, Tour } from "@/lib/domain/types";
import type {
  MatchStatus,
  ProviderEntry,
  ProviderMatch,
  ProviderMatchStat,
  ProviderPlayer,
  ProviderTournament,
  TennisDataProvider,
  TournamentCategory,
} from "./provider";

interface SrCompetitor {
  id: string;
  name: string;
  country_code?: string;
  qualifier?: "home" | "away";
  seed?: number;
}

interface SrSummary {
  sport_event: {
    id: string;
    start_time: string;
    sport_event_context?: { round?: { name?: string; number?: number }; competition?: { gender?: string } };
    competitors: SrCompetitor[];
  };
  sport_event_status: {
    status: string;
    match_status?: string;
    winner_id?: string;
    period_scores?: Array<{ home_score: number; away_score: number }>;
  };
  statistics?: {
    totals?: {
      competitors?: Array<{
        id: string;
        statistics?: { aces?: number; double_faults?: number; breakpoints_won?: number };
      }>;
    };
  };
}

const GRAND_SLAMS = /australian open|roland garros|french open|wimbledon|us open/i;
const MASTERS = /indian wells|miami|monte.carlo|madrid|rome|italian|canada|toronto|montreal|cincinnati|shanghai|paris|beijing|china open|wuhan|doha|dubai/i;

function surfaceFor(name: string): Surface {
  if (/roland garros|french open|monte.carlo|madrid|rome|italian/i.test(name)) return "CLAY";
  if (/wimbledon/i.test(name)) return "GRASS";
  return "HARD";
}

const ROUND_ORDER = ["round_of_128", "round_of_64", "round_of_32", "round_of_16", "quarterfinal", "semifinal", "final"];

export class SportradarProvider implements TennisDataProvider {
  readonly name = "sportradar";

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = "https://api.sportradar.com/tennis/trial/v3/en",
  ) {}

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { accept: "application/json", "x-api-key": this.apiKey },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Sportradar ${path} failed: ${res.status}`);
    return (await res.json()) as T;
  }

  async getRankings(tour: Tour): Promise<ProviderPlayer[]> {
    const data = await this.get<{
      rankings: Array<{
        name: string;
        competitor_rankings: Array<{ rank: number; points: number; competitor: SrCompetitor }>;
      }>;
    }>("/rankings.json");
    const table = data.rankings.find((r) => r.name.toUpperCase() === tour);
    return (table?.competitor_rankings ?? []).slice(0, 200).map((r) => ({
      externalId: r.competitor.id,
      name: r.competitor.name.includes(",")
        ? r.competitor.name.split(",").map((s) => s.trim()).reverse().join(" ")
        : r.competitor.name,
      tour,
      country: r.competitor.country_code ?? "",
      rank: r.rank,
      rankPoints: r.points,
      // Not in the rankings feed; the sync derives form and records from stored matches.
      hardWinPct: 0.5,
      clayWinPct: 0.5,
      grassWinPct: 0.5,
      seasonWins: 0,
      seasonLosses: 0,
      recentForm: "",
    }));
  }

  async getTournaments(season: number): Promise<ProviderTournament[]> {
    const data = await this.get<{
      seasons: Array<{ id: string; name: string; start_date: string; end_date: string; year: string }>;
    }>("/seasons.json");
    const now = new Date();
    return data.seasons
      .filter((s) => Number(s.year) === season && /singles/i.test(s.name) && !/doubles|qualif/i.test(s.name))
      .filter((s) => GRAND_SLAMS.test(s.name) || MASTERS.test(s.name))
      .map((s) => {
        const startsAt = new Date(`${s.start_date}T10:00:00Z`);
        const endsAt = new Date(`${s.end_date}T23:59:59Z`);
        const category: TournamentCategory = GRAND_SLAMS.test(s.name) ? "GRAND_SLAM" : "MASTERS_1000";
        const tours: Tour[] = /women/i.test(s.name) ? ["WTA"] : ["ATP"];
        return {
          externalId: s.id,
          name: s.name.replace(/\s*(men|women)'?s? singles.*$/i, "").trim(),
          category,
          surface: surfaceFor(s.name),
          tours,
          location: "",
          season,
          startsAt,
          endsAt,
          status: now < startsAt ? "UPCOMING" : now > endsAt ? "COMPLETED" : "LIVE",
        } satisfies ProviderTournament;
      });
  }

  private async summaries(seasonId: string): Promise<SrSummary[]> {
    const data = await this.get<{ summaries: SrSummary[] }>(`/seasons/${seasonId}/summaries.json`);
    return data.summaries ?? [];
  }

  private tourOf(s: SrSummary): Tour {
    return s.sport_event.sport_event_context?.competition?.gender === "women" ? "WTA" : "ATP";
  }

  async getEntries(tournamentExternalId: string): Promise<ProviderEntry[]> {
    const entries = new Map<string, ProviderEntry>();
    for (const s of await this.summaries(tournamentExternalId)) {
      const loser = s.sport_event_status.winner_id
        ? s.sport_event.competitors.find((c) => c.id !== s.sport_event_status.winner_id)?.id
        : undefined;
      for (const c of s.sport_event.competitors) {
        const prev = entries.get(c.id);
        entries.set(c.id, {
          playerExternalId: c.id,
          tour: this.tourOf(s),
          seed: c.seed ?? prev?.seed ?? null,
          eliminated: (prev?.eliminated ?? false) || c.id === loser,
        });
      }
    }
    return [...entries.values()];
  }

  async getMatches(tournamentExternalId: string): Promise<ProviderMatch[]> {
    return (await this.summaries(tournamentExternalId)).map((s) => {
      const [home, away] = ["home", "away"].map(
        (q) => s.sport_event.competitors.find((c) => c.qualifier === q) ?? s.sport_event.competitors[0],
      );
      const periods = s.sport_event_status.period_scores ?? [];
      const score = periods.map((p) => [p.home_score, p.away_score] as [number, number]);
      const totals = s.statistics?.totals?.competitors ?? [];
      const stat = (c: SrCompetitor, side: "A" | "B"): ProviderMatchStat => {
        const st = totals.find((t) => t.id === c.id)?.statistics ?? {};
        const won = score.filter(([h, a]) => (side === "A" ? h > a : a > h)).length;
        return {
          playerExternalId: c.id,
          side,
          aces: st.aces ?? 0,
          doubleFaults: st.double_faults ?? 0,
          breakPointsConverted: st.breakpoints_won ?? 0,
          setsWon: won,
          setsLost: score.length - won,
        };
      };
      const roundName = s.sport_event.sport_event_context?.round?.name ?? "round";
      const isFinal = ["closed", "ended"].includes(s.sport_event_status.status);
      const status: MatchStatus = isFinal
        ? s.sport_event_status.match_status === "walkover"
          ? "WALKOVER"
          : s.sport_event_status.match_status === "retired"
            ? "RETIRED"
            : "COMPLETED"
        : s.sport_event_status.status === "live"
          ? "LIVE"
          : "SCHEDULED";
      return {
        externalId: s.sport_event.id,
        tour: this.tourOf(s),
        round: Math.max(1, ROUND_ORDER.indexOf(roundName) + 1),
        roundName: roundName.replace(/_/g, " "),
        status,
        scheduledAt: new Date(s.sport_event.start_time),
        bestOf: periods.length > 3 ? 5 : 3,
        winnerExternalId: s.sport_event_status.winner_id ?? null,
        score,
        stats: [stat(home, "A"), stat(away, "B")],
      };
    });
  }
}
