// Demo dataset for the mock provider. Names are real tour players; rankings,
// points and surface records are approximate and for demonstration only.
import type { Surface, Tour } from "@/lib/domain/types";
import type { TournamentCategory } from "./provider";

type Specialty = "H" | "C" | "G";

export interface SeedPlayer {
  name: string;
  country: string;
  specialty: Specialty;
}

export const ATP_PLAYERS: SeedPlayer[] = [
  { name: "Jannik Sinner", country: "ITA", specialty: "H" },
  { name: "Carlos Alcaraz", country: "ESP", specialty: "C" },
  { name: "Alexander Zverev", country: "GER", specialty: "C" },
  { name: "Taylor Fritz", country: "USA", specialty: "H" },
  { name: "Novak Djokovic", country: "SRB", specialty: "G" },
  { name: "Jack Draper", country: "GBR", specialty: "H" },
  { name: "Ben Shelton", country: "USA", specialty: "H" },
  { name: "Lorenzo Musetti", country: "ITA", specialty: "C" },
  { name: "Alex de Minaur", country: "AUS", specialty: "H" },
  { name: "Holger Rune", country: "DEN", specialty: "C" },
  { name: "Daniil Medvedev", country: "RUS", specialty: "H" },
  { name: "Casper Ruud", country: "NOR", specialty: "C" },
  { name: "Tommy Paul", country: "USA", specialty: "H" },
  { name: "Andrey Rublev", country: "RUS", specialty: "H" },
  { name: "Jakub Mensik", country: "CZE", specialty: "H" },
  { name: "Arthur Fils", country: "FRA", specialty: "H" },
  { name: "Francisco Cerundolo", country: "ARG", specialty: "C" },
  { name: "Karen Khachanov", country: "RUS", specialty: "H" },
  { name: "Frances Tiafoe", country: "USA", specialty: "H" },
  { name: "Alejandro Davidovich Fokina", country: "ESP", specialty: "C" },
  { name: "Grigor Dimitrov", country: "BUL", specialty: "G" },
  { name: "Ugo Humbert", country: "FRA", specialty: "H" },
  { name: "Felix Auger-Aliassime", country: "CAN", specialty: "H" },
  { name: "Stefanos Tsitsipas", country: "GRE", specialty: "C" },
  { name: "Tomas Machac", country: "CZE", specialty: "H" },
  { name: "Jiri Lehecka", country: "CZE", specialty: "H" },
  { name: "Joao Fonseca", country: "BRA", specialty: "C" },
  { name: "Sebastian Korda", country: "USA", specialty: "H" },
  { name: "Hubert Hurkacz", country: "POL", specialty: "G" },
  { name: "Alexei Popyrin", country: "AUS", specialty: "H" },
  { name: "Denis Shapovalov", country: "CAN", specialty: "H" },
  { name: "Flavio Cobolli", country: "ITA", specialty: "C" },
  { name: "Brandon Nakashima", country: "USA", specialty: "H" },
  { name: "Alex Michelsen", country: "USA", specialty: "H" },
  { name: "Tallon Griekspoor", country: "NED", specialty: "G" },
  { name: "Matteo Berrettini", country: "ITA", specialty: "G" },
  { name: "Giovanni Mpetshi Perricard", country: "FRA", specialty: "G" },
  { name: "Sebastian Baez", country: "ARG", specialty: "C" },
  { name: "Alexander Bublik", country: "KAZ", specialty: "G" },
  { name: "Learner Tien", country: "USA", specialty: "H" },
  { name: "Jordan Thompson", country: "AUS", specialty: "H" },
  { name: "Nuno Borges", country: "POR", specialty: "C" },
  { name: "Cameron Norrie", country: "GBR", specialty: "H" },
  { name: "Gael Monfils", country: "FRA", specialty: "H" },
  { name: "Tomas Martin Etcheverry", country: "ARG", specialty: "C" },
  { name: "Zizou Bergs", country: "BEL", specialty: "H" },
  { name: "Jacob Fearnley", country: "GBR", specialty: "G" },
  { name: "Marcos Giron", country: "USA", specialty: "H" },
];

export const WTA_PLAYERS: SeedPlayer[] = [
  { name: "Aryna Sabalenka", country: "BLR", specialty: "H" },
  { name: "Iga Swiatek", country: "POL", specialty: "C" },
  { name: "Coco Gauff", country: "USA", specialty: "H" },
  { name: "Jessica Pegula", country: "USA", specialty: "H" },
  { name: "Mirra Andreeva", country: "RUS", specialty: "C" },
  { name: "Elena Rybakina", country: "KAZ", specialty: "G" },
  { name: "Madison Keys", country: "USA", specialty: "H" },
  { name: "Jasmine Paolini", country: "ITA", specialty: "C" },
  { name: "Qinwen Zheng", country: "CHN", specialty: "H" },
  { name: "Emma Navarro", country: "USA", specialty: "H" },
  { name: "Amanda Anisimova", country: "USA", specialty: "G" },
  { name: "Paula Badosa", country: "ESP", specialty: "C" },
  { name: "Diana Shnaider", country: "RUS", specialty: "H" },
  { name: "Elina Svitolina", country: "UKR", specialty: "C" },
  { name: "Karolina Muchova", country: "CZE", specialty: "H" },
  { name: "Barbora Krejcikova", country: "CZE", specialty: "G" },
  { name: "Daria Kasatkina", country: "AUS", specialty: "C" },
  { name: "Clara Tauson", country: "DEN", specialty: "H" },
  { name: "Liudmila Samsonova", country: "RUS", specialty: "H" },
  { name: "Belinda Bencic", country: "SUI", specialty: "H" },
  { name: "Ekaterina Alexandrova", country: "RUS", specialty: "G" },
  { name: "Donna Vekic", country: "CRO", specialty: "G" },
  { name: "Beatriz Haddad Maia", country: "BRA", specialty: "C" },
  { name: "Leylah Fernandez", country: "CAN", specialty: "H" },
  { name: "Marta Kostyuk", country: "UKR", specialty: "H" },
  { name: "Jelena Ostapenko", country: "LAT", specialty: "C" },
  { name: "Linda Noskova", country: "CZE", specialty: "H" },
  { name: "Naomi Osaka", country: "JPN", specialty: "H" },
  { name: "Victoria Mboko", country: "CAN", specialty: "H" },
  { name: "Emma Raducanu", country: "GBR", specialty: "G" },
  { name: "Elise Mertens", country: "BEL", specialty: "C" },
  { name: "Magdalena Frech", country: "POL", specialty: "H" },
  { name: "Sofia Kenin", country: "USA", specialty: "H" },
  { name: "Anna Kalinskaya", country: "RUS", specialty: "H" },
  { name: "Marketa Vondrousova", country: "CZE", specialty: "G" },
  { name: "Dayana Yastremska", country: "UKR", specialty: "H" },
  { name: "Ons Jabeur", country: "TUN", specialty: "G" },
  { name: "Yulia Putintseva", country: "KAZ", specialty: "C" },
  { name: "McCartney Kessler", country: "USA", specialty: "H" },
  { name: "Peyton Stearns", country: "USA", specialty: "C" },
  { name: "Maria Sakkari", country: "GRE", specialty: "H" },
  { name: "Lulu Sun", country: "NZL", specialty: "G" },
  { name: "Anastasia Potapova", country: "RUS", specialty: "C" },
  { name: "Veronika Kudermetova", country: "RUS", specialty: "H" },
  { name: "Katie Boulter", country: "GBR", specialty: "G" },
  { name: "Jaqueline Cristian", country: "ROU", specialty: "C" },
  { name: "Camila Osorio", country: "COL", specialty: "C" },
  { name: "Eva Lys", country: "GER", specialty: "H" },
];

export interface SeedTournament {
  slug: string;
  name: string;
  category: TournamentCategory;
  surface: Surface;
  tours: Tour[];
  location: string;
  /** Inclusive dates, YYYY-MM-DD. Play starts at 10:00 UTC on the first day. */
  start: string;
  end: string;
}

export const CALENDAR_2026: SeedTournament[] = [
  { slug: "australian-open", name: "Australian Open", category: "GRAND_SLAM", surface: "HARD", tours: ["ATP", "WTA"], location: "Melbourne", start: "2026-01-18", end: "2026-02-01" },
  { slug: "indian-wells", name: "BNP Paribas Open", category: "MASTERS_1000", surface: "HARD", tours: ["ATP", "WTA"], location: "Indian Wells", start: "2026-03-04", end: "2026-03-15" },
  { slug: "miami", name: "Miami Open", category: "MASTERS_1000", surface: "HARD", tours: ["ATP", "WTA"], location: "Miami", start: "2026-03-18", end: "2026-03-29" },
  { slug: "monte-carlo", name: "Monte-Carlo Masters", category: "MASTERS_1000", surface: "CLAY", tours: ["ATP"], location: "Monte Carlo", start: "2026-04-05", end: "2026-04-12" },
  { slug: "madrid", name: "Mutua Madrid Open", category: "MASTERS_1000", surface: "CLAY", tours: ["ATP", "WTA"], location: "Madrid", start: "2026-04-22", end: "2026-05-03" },
  { slug: "rome", name: "Internazionali BNL d'Italia", category: "MASTERS_1000", surface: "CLAY", tours: ["ATP", "WTA"], location: "Rome", start: "2026-05-06", end: "2026-05-17" },
  { slug: "roland-garros", name: "Roland Garros", category: "GRAND_SLAM", surface: "CLAY", tours: ["ATP", "WTA"], location: "Paris", start: "2026-05-24", end: "2026-06-07" },
  { slug: "wimbledon", name: "Wimbledon", category: "GRAND_SLAM", surface: "GRASS", tours: ["ATP", "WTA"], location: "London", start: "2026-06-29", end: "2026-07-12" },
  { slug: "canada", name: "National Bank Open", category: "MASTERS_1000", surface: "HARD", tours: ["ATP", "WTA"], location: "Toronto & Montreal", start: "2026-08-02", end: "2026-08-13" },
  { slug: "cincinnati", name: "Cincinnati Open", category: "MASTERS_1000", surface: "HARD", tours: ["ATP", "WTA"], location: "Cincinnati", start: "2026-08-14", end: "2026-08-24" },
  { slug: "us-open", name: "US Open", category: "GRAND_SLAM", surface: "HARD", tours: ["ATP", "WTA"], location: "New York", start: "2026-08-30", end: "2026-09-13" },
  { slug: "beijing", name: "China Open", category: "MASTERS_1000", surface: "HARD", tours: ["WTA"], location: "Beijing", start: "2026-09-23", end: "2026-10-04" },
  { slug: "shanghai", name: "Rolex Shanghai Masters", category: "MASTERS_1000", surface: "HARD", tours: ["ATP"], location: "Shanghai", start: "2026-09-30", end: "2026-10-11" },
  { slug: "wuhan", name: "Wuhan Open", category: "MASTERS_1000", surface: "HARD", tours: ["WTA"], location: "Wuhan", start: "2026-10-05", end: "2026-10-11" },
  { slug: "paris", name: "Rolex Paris Masters", category: "MASTERS_1000", surface: "HARD", tours: ["ATP"], location: "Paris", start: "2026-10-26", end: "2026-11-01" },
];
