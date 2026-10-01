// IOC country codes (as used by the tours) to flag emoji. Players competing
// as neutrals (RUS, BLR) get no flag, matching tour presentation.
const IOC_TO_ISO: Record<string, string> = {
  ARG: "AR", AUS: "AU", BEL: "BE", BRA: "BR", BUL: "BG", CAN: "CA", CHN: "CN", COL: "CO",
  CRO: "HR", CZE: "CZ", DEN: "DK", ESP: "ES", FRA: "FR", GBR: "GB", GER: "DE", GRE: "GR",
  ITA: "IT", JPN: "JP", KAZ: "KZ", LAT: "LV", NED: "NL", NOR: "NO", NZL: "NZ", POL: "PL",
  POR: "PT", ROU: "RO", SRB: "RS", SUI: "CH", TUN: "TN", UKR: "UA", USA: "US",
};

export function flagEmoji(ioc: string): string | null {
  const iso = IOC_TO_ISO[ioc.toUpperCase()];
  if (!iso) return null;
  return String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
