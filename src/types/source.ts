export type SourceType = "gov" | "association" | "media";
export type RegionLevel = "country" | "province" | "city" | "district";
export type FetchMode = "list" | "rss";
export type FetchFrequency = "hourly" | "6h" | "daily" | "weekly";
export type SourceStatus = "active" | "paused" | "disabled";
export type IntelRole = "supervisor" | "staff";

export interface IntelSource {
  id: string;
  name: string;
  type: SourceType;
  rootDomain: string;
  allowedHosts: string[];
  entryUrls: string[];
  fetchMode: FetchMode;
  selectors: Record<string, string> | null;
  frequency: FetchFrequency;
  regionLevel: RegionLevel;
  status: SourceStatus;
  lastSuccessAt: string | null;
  failCount: number;
  owner: string;
  publicOnlyConfirmed: boolean;
}

export interface DryRunLink {
  url: string;
  title: string;
}

export interface DryRunRobots {
  allowed: boolean;
  rule: string | null;
  robotsUrl: string;
  body: string;
}

export interface DryRunResult {
  robots: DryRunRobots;
  links: DryRunLink[];
  parsedAt: string;
  durationMs: number;
}

export interface SourceDraft {
  id: string | null;
  name: string;
  type: SourceType;
  rootDomain: string;
  allowedHosts: string[];
  entryUrls: string[];
  fetchMode: FetchMode;
  selectorsText: string;
  frequency: FetchFrequency;
  regionLevel: RegionLevel;
  status: SourceStatus;
  owner: string;
  publicOnlyConfirmed: boolean;
}

export interface SourceFilters {
  type: SourceType | "all";
  status: SourceStatus | "all";
  regionLevel: RegionLevel | "all";
}
