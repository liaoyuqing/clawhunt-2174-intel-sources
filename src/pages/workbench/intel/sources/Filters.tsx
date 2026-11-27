import { Select } from "tdesign-react";
import {
  REGION_OPTIONS,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  type Option,
} from "../../../../constants/intel-options";
import type { SourceFilters } from "../../../../types/source";

export type FilterKey = "type" | "status" | "regionLevel";

type AnyOption = Option<string>;

function withAll(options: AnyOption[], allLabel = "全部"): AnyOption[] {
  return [{ value: "all", label: allLabel }, ...options];
}

export interface FiltersProps {
  filters: SourceFilters;
  onChange: (next: SourceFilters) => void;
  resultCount: number;
  totalCount: number;
}

export function Filters({ filters, onChange, resultCount, totalCount }: FiltersProps) {
  const fields: { key: FilterKey; label: string; options: AnyOption[] }[] = [
    { key: "type", label: "类型", options: withAll(TYPE_OPTIONS as AnyOption[]) },
    { key: "status", label: "状态", options: withAll(STATUS_OPTIONS as AnyOption[]) },
    { key: "regionLevel", label: "地区层级", options: withAll(REGION_OPTIONS as AnyOption[]) },
  ];

  return (
    <div className="filters" data-testid="source-filters">
      {fields.map((field) => (
        <label className="filters__field" key={field.key}>
          <span className="filters__label">{field.label}</span>
          <div className="filters__select" data-testid={"filter-" + field.key}>
            <Select
              size="small"
              value={filters[field.key]}
              options={field.options}
              onChange={(value) => onChange({ ...filters, [field.key]: String(value) })}
            />
          </div>
        </label>
      ))}
      <span className="filters__count" data-testid="filter-count">
        命中 {resultCount} / 共 {totalCount} 条
      </span>
    </div>
  );
}
