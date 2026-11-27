import type { FetchFrequency, FetchMode, RegionLevel, SourceStatus, SourceType } from "../types/source";

export interface Option<T extends string> {
  value: T;
  label: string;
}

export const TYPE_OPTIONS: Option<SourceType>[] = [
  { value: "gov", label: "政府部门官网" },
  { value: "association", label: "行业协会" },
  { value: "media", label: "权威媒体" },
];

export const REGION_OPTIONS: Option<RegionLevel>[] = [
  { value: "country", label: "国家" },
  { value: "province", label: "省" },
  { value: "city", label: "市" },
  { value: "district", label: "区县" },
];

export const FREQUENCY_OPTIONS: Option<FetchFrequency>[] = [
  { value: "hourly", label: "1 小时" },
  { value: "6h", label: "6 小时" },
  { value: "daily", label: "每天" },
  { value: "weekly", label: "每周" },
];

export const FETCH_MODE_OPTIONS: Option<FetchMode>[] = [
  { value: "list", label: "列表页" },
  { value: "rss", label: "RSS" },
];

export const STATUS_OPTIONS: Option<SourceStatus>[] = [
  { value: "active", label: "启用" },
  { value: "paused", label: "暂停" },
  { value: "disabled", label: "停用" },
];

export function labelOf<T extends string>(options: Option<T>[], value: T): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export const TYPE_THEME: Record<SourceType, "primary" | "success" | "warning"> = {
  gov: "primary",
  association: "success",
  media: "warning",
};

export const STATUS_THEME: Record<SourceStatus, "success" | "warning" | "default"> = {
  active: "success",
  paused: "warning",
  disabled: "default",
};
