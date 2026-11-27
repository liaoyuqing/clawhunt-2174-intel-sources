import type { IntelSource, SourceFilters } from "../types/source";

export const EMPTY_FILTERS: SourceFilters = { type: "all", status: "all", regionLevel: "all" };

/** 三个维度可任选组合，全部为 all 时原样返回。纯函数，界面与测试共用同一份判定。 */
export function filterSources(rows: IntelSource[], filters: SourceFilters): IntelSource[] {
  return rows.filter((row) => {
    if (filters.type !== "all" && row.type !== filters.type) return false;
    if (filters.status !== "all" && row.status !== filters.status) return false;
    if (filters.regionLevel !== "all" && row.regionLevel !== filters.regionLevel) return false;
    return true;
  });
}

export function countByDimension(rows: IntelSource[], filters: SourceFilters): number {
  return filterSources(rows, filters).length;
}
