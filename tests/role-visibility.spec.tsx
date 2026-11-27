import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderPageReady } from "./helpers";
import { SAMPLE_ROWS } from "./helpers";
import { buildRoleState, parseRoleParam, resolveEffectiveRole } from "../src/hooks/useIntelRole";

const ROUTE = "/workbench/intel/sources";

describe("AC3 非主管账号看不到新建与编辑按钮（只读视图）", () => {
  it("staff 角色：新建按钮与所有行内编辑按钮都不渲染，列表照常渲染", async () => {
    const { container } = await renderPageReady(ROUTE + "?role=intel_staff", "staff");

    expect(screen.getByTestId("role-label").textContent).toBe("运营专员");
    expect(screen.queryByTestId("create-source")).toBeNull();
    expect(container.querySelectorAll('[data-testid^="edit-src-"]').length).toBe(0);

    const table = screen.getByTestId("source-table");
    expect(within(table).getAllByRole("row").length).toBe(SAMPLE_ROWS.length + 1);
    expect(screen.getByTestId("source-name-src-001")).toBeInTheDocument();
  });

  it("supervisor 角色：新建按钮 1 个、每行编辑按钮 1 个", async () => {
    const { container } = await renderPageReady(ROUTE + "?role=intel_supervisor", "supervisor");

    expect(screen.getByTestId("role-label").textContent).toBe("情报主管");
    expect(screen.getAllByTestId("create-source").length).toBe(1);
    expect(container.querySelectorAll('[data-testid^="edit-src-"]').length).toBe(SAMPLE_ROWS.length);
  });

  it("staff 即便把 ?edit=src-003 塞进地址，抽屉节点数量仍为 0（只读不是靠隐藏按钮）", async () => {
    await renderPageReady(ROUTE + "?role=intel_staff&edit=src-003", "staff");
    expect(screen.queryByTestId("source-drawer-form")).toBeNull();
    expect(screen.queryByTestId("drawer-submit")).toBeNull();
    expect(screen.queryByTestId("readonly-banner")).toBeNull();
  });

  it("staff 的试抓按钮也不可触达：抽屉根本不打开，页面无 dry-run 面板", async () => {
    await renderPageReady(ROUTE + "?role=intel_staff&edit=src-003", "staff");
    expect(screen.queryByTestId("dry-run-panel")).toBeNull();
    expect(screen.queryByTestId("dry-run-button")).toBeNull();
  });

  it("supervisor 下 ?edit=src-003 深链会打开对应来源的编辑抽屉（对照组，证明上一条不是测试假阴性）", async () => {
    await renderPageReady(ROUTE + "?role=intel_supervisor&edit=src-003", "supervisor");
    const form = await screen.findByTestId("source-drawer-form");
    expect(form.getAttribute("data-mode")).toBe("edit");
    expect(screen.getByTestId("field-name")).toBeInTheDocument();
  });

  it("防提权：会话是 staff 时地址栏写 ?role=intel_supervisor 也仍是只读，不渲染任何写入口", async () => {
    const { container } = await renderPageReady(ROUTE + "?role=intel_supervisor&edit=src-003", "staff");

    expect(screen.getByTestId("intel-sources-page").getAttribute("data-session-role")).toBe("staff");
    expect(screen.getByTestId("intel-sources-page").getAttribute("data-role")).toBe("staff");
    expect(screen.queryByTestId("create-source")).toBeNull();
    expect(container.querySelectorAll('[data-testid^="edit-src-"]').length).toBe(0);
    expect(screen.queryByTestId("source-drawer-form")).toBeNull();
  });

  it("resolveEffectiveRole：会话 staff 一律只读，会话 supervisor 允许地址栏降级到 staff", () => {
    expect(resolveEffectiveRole("staff", "supervisor")).toBe("staff");
    expect(resolveEffectiveRole("staff", "staff")).toBe("staff");
    expect(resolveEffectiveRole("supervisor", "staff")).toBe("staff");
    expect(resolveEffectiveRole("supervisor", "supervisor")).toBe("supervisor");
  });

  it("角色参数解析：supervisor 默认 / staff 简写 / 未知值回落主管；canWrite 只对主管为真", () => {
    expect(parseRoleParam("intel_supervisor")).toBe("supervisor");
    expect(parseRoleParam("staff")).toBe("staff");
    expect(parseRoleParam("INTEL_STAFF")).toBe("staff");
    expect(parseRoleParam("auditor")).toBe("supervisor");
    expect(parseRoleParam(null)).toBe("supervisor");
    expect(buildRoleState("staff").canWrite).toBe(false);
    expect(buildRoleState("supervisor").canWrite).toBe(true);
  });
});
