import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { FailCountCell, FAIL_ALERT_THRESHOLD, failLevelOf } from "../src/pages/workbench/intel/sources/FailCountCell";
import { renderPageReady, SAMPLE_ROWS } from "./helpers";

describe("AC4 连续失败次数 ≥ 3 的来源标红", () => {
  it("阈值常量固定为 3，且 2 判 normal、3 判 alert、7 判 alert（边界各测一次）", () => {
    expect(FAIL_ALERT_THRESHOLD).toBe(3);
    expect(failLevelOf(0)).toBe("zero");
    expect(failLevelOf(2)).toBe("normal");
    expect(failLevelOf(3)).toBe("alert");
    expect(failLevelOf(7)).toBe("alert");
    expect(failLevelOf(3, 5)).toBe("normal");
    expect(failLevelOf(5, 5)).toBe("alert");
  });

  it("2 不红、3 红：data-fail-level 与内联颜色双通道同时可机检", () => {
    const two = render(<FailCountCell failCount={2} />);
    const twoNode = screen.getByTestId("fail-count");
    expect(twoNode.getAttribute("data-fail-level")).toBe("normal");
    expect(twoNode.getAttribute("data-fail-count")).toBe("2");
    expect(twoNode.style.color).not.toBe("rgb(213, 73, 65)");
    expect(screen.queryByTestId("fail-count-hint")).toBeNull();
    two.unmount();

    render(<FailCountCell failCount={3} />);
    const threeNode = screen.getByTestId("fail-count");
    expect(threeNode.getAttribute("data-fail-level")).toBe("alert");
    expect(threeNode.style.color).toBe("rgb(213, 73, 65)");
    expect(threeNode.style.fontWeight).toBe("700");
    expect(screen.getByTestId("fail-count-hint")).toBeInTheDocument();
  });

  it("0 次显示灰色 0，且不显示「连续失败」角标", () => {
    render(<FailCountCell failCount={0} />);
    const node = screen.getByTestId("fail-count");
    expect(node.getAttribute("data-fail-level")).toBe("zero");
    expect(node.textContent).toBe("0");
    expect(node.style.color).toBe("rgb(148, 163, 184)");
  });

  it("列表里 3 与 2 并排：src-003（3 次）为 alert，src-002（2 次）为 normal，可直接对照", async () => {
    await renderPageReady("/workbench/intel/sources?role=intel_supervisor");
    const row3 = screen.getByTestId("source-row-src-003");
    const row2 = screen.getByTestId("source-row-src-002");
    const cell3 = within(row3).getByTestId("fail-count");
    const cell2 = within(row2).getByTestId("fail-count");
    expect(cell3.getAttribute("data-fail-level")).toBe("alert");
    expect(cell2.getAttribute("data-fail-level")).toBe("normal");
    expect(cell3.style.color).toBe("rgb(213, 73, 65)");
    expect(cell2.style.color).not.toBe("rgb(213, 73, 65)");
  });

  it("状态为 disabled 的来源同样按失败次数标红（叠加条件不影响判定）", async () => {
    await renderPageReady("/workbench/intel/sources?role=intel_staff");
    const disabledRow = SAMPLE_ROWS.find((row) => row.status === "disabled" && row.failCount >= 3);
    expect(disabledRow).toBeDefined();
    const cell = within(screen.getByTestId("source-row-" + disabledRow!.id)).getByTestId("fail-count");
    expect(cell.getAttribute("data-fail-level")).toBe("alert");
  });
});
