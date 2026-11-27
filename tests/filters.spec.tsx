import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderPageReady, SAMPLE_ROWS } from "./helpers";
import { EMPTY_FILTERS, filterSources } from "../src/utils/source-filter";
import { SOURCE_TABLE_COLUMNS } from "../src/pages/workbench/intel/sources/SourceTable";
import { REGION_OPTIONS, TYPE_OPTIONS } from "../src/constants/intel-options";

describe("列表列、筛选与虚构数据", () => {
  it("9 列表头与需求逐字一致（顺序也一致）", async () => {
    await renderPageReady("/workbench/intel/sources?role=intel_staff");
    const head = screen.getByTestId("source-table-head");
    const titles = Array.from(head.querySelectorAll("th")).map((node) => node.textContent);
    expect(titles).toEqual([
      "来源名称",
      "类型",
      "根域名",
      "地区层级",
      "抓取频率",
      "状态",
      "最近成功时间",
      "连续失败次数",
      "负责人",
    ]);
    expect(SOURCE_TABLE_COLUMNS.length).toBe(9);
  });

  it("纯函数：类型 / 状态 / 地区层级三维度可组合过滤", () => {
    const govActive = filterSources(SAMPLE_ROWS, { type: "gov", status: "active", regionLevel: "all" });
    expect(govActive.length).toBeGreaterThan(0);
    expect(govActive.every((row) => row.type === "gov" && row.status === "active")).toBe(true);

    const combo = filterSources(SAMPLE_ROWS, { type: "association", status: "all", regionLevel: "province" });
    expect(combo.map((row) => row.id)).toEqual(["src-006"]);

    const none = filterSources(SAMPLE_ROWS, { type: "media", status: "paused", regionLevel: "all" });
    expect(none).toEqual([]);

    expect(filterSources(SAMPLE_ROWS, EMPTY_FILTERS).length).toBe(SAMPLE_ROWS.length);
  });

  it("界面筛选：切到「权威媒体」后表格只剩 media 行，计数同步刷新", async () => {
    const user = userEvent.setup();
    await renderPageReady("/workbench/intel/sources?role=intel_staff");
    const expected = SAMPLE_ROWS.filter((row) => row.type === "media").length;

    const select = screen.getByTestId("filter-type").querySelector("input") as HTMLElement;
    await user.click(select);
    const option = await screen.findByText("权威媒体", { selector: ".t-select-option span" });
    await user.click(option);

    const rows = screen.getAllByTestId(/^source-row-/);
    expect(rows.length).toBe(expected);
    expect(screen.getByTestId("filter-count").textContent).toContain("命中 " + expected + " / 共 " + SAMPLE_ROWS.length + " 条");
  });

  it("最近成功时间为空的行显示「从未成功」", async () => {
    await renderPageReady("/workbench/intel/sources?role=intel_staff");
    const never = SAMPLE_ROWS.find((row) => row.lastSuccessAt === null);
    expect(never).toBeDefined();
    const cell = screen.getByTestId("last-success-" + never!.id);
    expect(cell.textContent).toBe("从未成功");
  });

  it("12 条 mock 全部虚构域名（*.example.cn），三种类型都覆盖，且没有真实个人信息字段", () => {
    expect(SAMPLE_ROWS.length).toBe(12);
    expect(SAMPLE_ROWS.every((row) => row.rootDomain.endsWith("example.cn"))).toBe(true);
    const types = new Set(SAMPLE_ROWS.map((row) => row.type));
    expect(types).toEqual(new Set(["gov", "association", "media"]));
    expect(TYPE_OPTIONS.map((option) => option.value)).toEqual(["gov", "association", "media"]);
    expect(REGION_OPTIONS.map((option) => option.value)).toEqual(["country", "province", "city", "district"]);
  });
});
