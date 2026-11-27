import { Button, Tag } from "tdesign-react";
import {
  FREQUENCY_OPTIONS,
  REGION_OPTIONS,
  STATUS_OPTIONS,
  STATUS_THEME,
  TYPE_OPTIONS,
  TYPE_THEME,
  labelOf,
} from "../../../../constants/intel-options";
import type { IntelSource } from "../../../../types/source";
import { FailCountCell } from "./FailCountCell";

export interface SourceTableProps {
  rows: IntelSource[];
  isSupervisor: boolean;
  onEdit: (row: IntelSource) => void;
}

export const SOURCE_TABLE_COLUMNS = [
  "来源名称",
  "类型",
  "根域名",
  "地区层级",
  "抓取频率",
  "状态",
  "最近成功时间",
  "连续失败次数",
  "负责人",
] as const;

export function SourceTable({ rows, isSupervisor, onEdit }: SourceTableProps) {
  return (
    <table className="source-table" data-testid="source-table">
      <thead>
        <tr data-testid="source-table-head">
          {SOURCE_TABLE_COLUMNS.map((title) => (
            <th key={title}>{title}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} data-testid={"source-row-" + row.id} data-source-id={row.id}>
            <td className="cell-name">
              <span className="source-name" data-testid={"source-name-" + row.id}>
                {row.name}
              </span>
              {isSupervisor ? (
                <Button
                  className="row-edit"
                  data-testid={"edit-" + row.id}
                  size="small"
                  variant="text"
                  theme="primary"
                  onClick={() => onEdit(row)}
                >
                  编辑
                </Button>
              ) : null}
            </td>
            <td className="cell-type">
              <Tag size="small" variant="light" theme={TYPE_THEME[row.type]} data-testid={"type-" + row.id}>
                {labelOf(TYPE_OPTIONS, row.type)}
              </Tag>
            </td>
            <td className="cell-domain">{row.rootDomain}</td>
            <td className="cell-region">{labelOf(REGION_OPTIONS, row.regionLevel)}</td>
            <td className="cell-frequency">{labelOf(FREQUENCY_OPTIONS, row.frequency)}</td>
            <td className="cell-status">
              <Tag size="small" variant="light" theme={STATUS_THEME[row.status]} data-testid={"status-" + row.id}>
                {labelOf(STATUS_OPTIONS, row.status)}
              </Tag>
            </td>
            <td className="cell-success" data-testid={"last-success-" + row.id}>
              {row.lastSuccessAt ?? <span className="never-success">从未成功</span>}
            </td>
            <td className="cell-fail">
              <FailCountCell failCount={row.failCount} />
            </td>
            <td className="cell-owner">{row.owner}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
