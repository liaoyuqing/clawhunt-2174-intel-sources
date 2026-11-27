import sourcesJson from "./mock/sources-12.json";
import allowedJson from "./mock/dry-run-allowed.json";
import blockedJson from "./mock/dry-run-blocked.json";
import { normalizeHost } from "../utils/host-match";
import type { DryRunResult, IntelSource, SourceDraft, SourceStatus } from "../types/source";

/**
 * 对接点：本单没有后端，下面三个函数都是 mock。
 * 接入真实服务时只需替换函数体，返回结构保持 IntelSource[] / DryRunResult：
 *   GET  /api/v1/intel/sources                   → IntelSource[]
 *   POST /api/v1/intel/sources/{id}/dry-run      → DryRunResult
 *   PUT  /api/v1/intel/sources/{id}              → IntelSource
 */
export const SOURCES_API_POINTS = {
  list: "GET /api/v1/intel/sources",
  save: "PUT /api/v1/intel/sources/{id}",
  dryRun: "POST /api/v1/intel/sources/{id}/dry-run",
} as const;

export type DryRunScenario = "allowed" | "blocked";

const seed = sourcesJson as unknown as IntelSource[];

export function cloneSources(): IntelSource[] {
  return seed.map((row) => ({
    ...row,
    allowedHosts: [...row.allowedHosts],
    entryUrls: [...row.entryUrls],
    selectors: row.selectors ? { ...row.selectors } : null,
  }));
}

export async function fetchSources(): Promise<IntelSource[]> {
  return cloneSources();
}

/** ?mock=dry-run-blocked / dry-run-allowed 可强制样例，用于截图与演示；非法值回落按主机推断。 */
export function resolveDryRunScenario(url: string, mockParam: string | null): DryRunScenario {
  const value = (mockParam ?? "").trim().toLowerCase();
  if (value === "dry-run-blocked") return "blocked";
  if (value === "dry-run-allowed") return "allowed";
  return scenarioForUrl(url);
}

export function scenarioForUrl(url: string): DryRunScenario {
  const host = (() => {
    try {
      return normalizeHost(new URL(url).hostname);
    } catch {
      return "";
    }
  })();
  // 规则：主机以 biz.example.cn 结尾（含裸域）走「禁止」样例，其余走「允许」样例
  return host === "biz.example.cn" || host.endsWith(".biz.example.cn") ? "blocked" : "allowed";
}

export async function runDryRun(_draft: SourceDraft, scenario: DryRunScenario): Promise<DryRunResult> {
  const payload = scenario === "blocked" ? blockedJson : allowedJson;
  return JSON.parse(JSON.stringify(payload)) as DryRunResult;
}

export function toDraft(row: IntelSource): SourceDraft {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    rootDomain: row.rootDomain,
    allowedHosts: [...row.allowedHosts],
    entryUrls: [...row.entryUrls],
    fetchMode: row.fetchMode,
    selectorsText: row.selectors ? JSON.stringify(row.selectors, null, 2) : "",
    frequency: row.frequency,
    regionLevel: row.regionLevel,
    status: row.status,
    owner: row.owner,
    publicOnlyConfirmed: row.publicOnlyConfirmed,
  };
}

export function emptyDraft(nextId: string): SourceDraft {
  return {
    id: nextId,
    name: "",
    type: "gov",
    rootDomain: "",
    allowedHosts: [],
    entryUrls: [""],
    fetchMode: "list",
    selectorsText: "",
    frequency: "daily",
    regionLevel: "country",
    status: "active" as SourceStatus,
    owner: "",
    publicOnlyConfirmed: false,
  };
}

export function nextSourceId(rows: IntelSource[]): string {
  const max = rows.reduce((acc, row) => {
    const matched = /^src-(\d+)$/.exec(row.id);
    const value = matched?.[1] === undefined ? 0 : Number(matched[1]);
    return Math.max(acc, value);
  }, 0);
  return "src-" + String(max + 1).padStart(3, "0");
}

export function draftToSource(draft: SourceDraft, rows: IntelSource[]): IntelSource {
  const selectors = draft.selectorsText.trim() ? (JSON.parse(draft.selectorsText) as Record<string, string>) : null;
  return {
    id: draft.id ?? nextSourceId(rows),
    name: draft.name.trim(),
    type: draft.type,
    rootDomain: draft.rootDomain.trim().toLowerCase(),
    allowedHosts: [...draft.allowedHosts],
    entryUrls: draft.entryUrls.map((url) => url.trim()).filter((url) => url.length > 0),
    fetchMode: draft.fetchMode,
    selectors,
    frequency: draft.frequency,
    regionLevel: draft.regionLevel,
    status: draft.status,
    lastSuccessAt: null,
    failCount: 0,
    owner: draft.owner,
    publicOnlyConfirmed: draft.publicOnlyConfirmed,
  };
}
