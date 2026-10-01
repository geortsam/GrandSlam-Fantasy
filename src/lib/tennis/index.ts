import { MockTennisProvider } from "./mock-provider";
import type { TennisDataProvider } from "./provider";
import { SportradarProvider } from "./sportradar-provider";

export type { TennisDataProvider } from "./provider";

let provider: TennisDataProvider | undefined;

/** Picks the provider from TENNIS_PROVIDER; the mock is the default and needs no key. */
export function getTennisProvider(): TennisDataProvider {
  if (provider) return provider;
  const kind = process.env.TENNIS_PROVIDER ?? "mock";
  if (kind === "sportradar") {
    const key = process.env.SPORTRADAR_API_KEY;
    if (!key) throw new Error("TENNIS_PROVIDER=sportradar needs SPORTRADAR_API_KEY");
    provider = new SportradarProvider(key, process.env.SPORTRADAR_BASE_URL);
  } else {
    provider = new MockTennisProvider();
  }
  return provider;
}

export function isDemoData(): boolean {
  return (process.env.TENNIS_PROVIDER ?? "mock") === "mock";
}
