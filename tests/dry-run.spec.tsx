import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { openEditDrawer, renderPageReady } from "./helpers";
import { DRY_RUN_LINK_LIMIT, summarizeDryRun } from "../src/utils/dry-run-format";
import { resolveDryRunScenario, scenarioForUrl } from "../src/services/sources";

const ROUTE = "/workbench/intel/sources?role=intel_supervisor";

describe("AC2 试抓结果区显示 robots 判定与前 10 条链接", () => {
  it("summarizeDryRun：12 条链接只取前 10 条，并写出「共解析 12 条，展示前 10 条」", async () => {
    const allowed = await import("../src/services/mock/dry-run-allowed.json");
    const summary = summarizeDryRun(allowed.default as never);
    expect(DRY_RUN_LINK_LIMIT).toBe(10);
    expect(summary.totalLinks).toBe(12);
    expect(summary.shownLinks.length).toBe(10);
    expect(summary.hiddenLinks).toBe(2);
    expect(summary.hasMore).toBe(true);
    expect(summary.noticeText).toBe("共解析 12 条，展示前 10 条");
    expect(summary.verdictText).toBe("允许抓取");
    expect(summary.ruleLabel).toBe("未命中禁止规则");
  });

  it("summarizeDryRun：禁止样例给出「禁止抓取」与命中的规则 Disallow: /search", async () => {
    const blocked = await import("../src/services/mock/dry-run-blocked.json");
    const summary = summarizeDryRun(blocked.default as never);
    expect(summary.robotsAllowed).toBe(false);
    expect(summary.verdictText).toBe("禁止抓取");
    expect(summary.verdictTheme).toBe("danger");
    expect(summary.ruleText).toBe("Disallow: /search");
    expect(summary.ruleLabel).toBe("命中规则：Disallow: /search");
  });

  it("scenarioForUrl：biz.example.cn 走禁止样例，其余走允许样例", () => {
    expect(scenarioForUrl("https://biz.example.cn/rss.xml")).toBe("blocked");
    expect(scenarioForUrl("https://www.biz.example.cn/a")).toBe("blocked");
    expect(scenarioForUrl("https://www.media.example.cn/x")).toBe("allowed");
    expect(scenarioForUrl("not-a-url")).toBe("allowed");
  });

  it("resolveDryRunScenario：?mock= 强制样例优先于主机推断，非法值回落推断", () => {
    expect(resolveDryRunScenario("https://www.media.example.cn/x", "dry-run-blocked")).toBe("blocked");
    expect(resolveDryRunScenario("https://biz.example.cn/rss.xml", "dry-run-allowed")).toBe("allowed");
    expect(resolveDryRunScenario("https://biz.example.cn/rss.xml", "whatever")).toBe("blocked");
    expect(resolveDryRunScenario("https://biz.example.cn/rss.xml", null)).toBe("blocked");
    expect(resolveDryRunScenario("https://www.media.example.cn/x", null)).toBe("allowed");
  });

  it("允许场景：点「试抓」后结果区显示 robots 允许、链接总数 12、只渲染 10 条链接", async () => {
    const user = userEvent.setup();
    await renderPageReady(ROUTE);
    await openEditDrawer(8); // src-009 权威媒体，默认报「允许」

    await user.click(screen.getByTestId("dry-run-button"));

    const verdict = await screen.findByTestId("robots-verdict");
    expect(verdict.getAttribute("data-robots-allowed")).toBe("true");
    expect(screen.getByTestId("robots-verdict-tag").textContent).toContain("robots 允许抓取");
    expect(screen.getByTestId("robots-rule").textContent).toBe("未命中禁止规则");
    expect(screen.getByTestId("dry-run-count").getAttribute("data-total-links")).toBe("12");
    expect(screen.getByTestId("dry-run-count").textContent).toBe("共解析 12 条，展示前 10 条");
    expect(screen.getAllByTestId(/^dry-run-link-\d+$/).length).toBe(10);
    expect(screen.queryByTestId("dry-run-link-10")).toBeNull();
    expect(screen.getByTestId("dry-run-limit-note").textContent).toContain("另有 2 条未展示");
  });

  it("禁止场景：biz.example.cn 入口点试抓后显示「robots 禁止抓取」与命中规则", async () => {
    const user = userEvent.setup();
    await renderPageReady(ROUTE);
    await openEditDrawer(9); // src-010 财经快讯网 biz.example.cn

    await user.click(screen.getByTestId("dry-run-button"));
    const verdict = await screen.findByTestId("robots-verdict");
    expect(verdict.getAttribute("data-robots-allowed")).toBe("false");
    expect(screen.getByTestId("robots-verdict-tag").textContent).toContain("robots 禁止抓取");
    expect(screen.getByTestId("robots-rule").textContent).toBe("命中规则：Disallow: /search");
  });

  it("链接可点击且带 target=_blank 与 rel=noopener noreferrer（安全断言）", async () => {
    const user = userEvent.setup();
    await renderPageReady(ROUTE);
    await openEditDrawer(8);
    await user.click(screen.getByTestId("dry-run-button"));

    const anchor = await screen.findByTestId("dry-run-link-anchor-0");
    expect(anchor.getAttribute("target")).toBe("_blank");
    expect(anchor.getAttribute("rel")).toBe("noopener noreferrer");
    expect(anchor.getAttribute("href")).toContain("https://www.media.example.cn/channel/industry/");
  });

  it("试抓前显示占位提示，试抓后面板保留输入（草稿未被清空）", async () => {
    const user = userEvent.setup();
    await renderPageReady(ROUTE);
    await openEditDrawer(8);
    expect(screen.getByTestId("dry-run-idle")).toBeInTheDocument();
    await user.click(screen.getByTestId("dry-run-button"));
    await screen.findByTestId("dry-run-result");
    expect(screen.queryByTestId("dry-run-idle")).toBeNull();
    const nameField = screen.getByTestId("field-name").querySelector("input") as HTMLInputElement;
    expect(nameField.value.length).toBeGreaterThan(0);
  });

  it("试抓结果区的三元组可机检：判定 / 命中规则 / 链接总数（供 docs/checks/ac2-dryrun.log 复核）", async () => {
    const user = userEvent.setup();
    const { unmount } = await renderPageReady(ROUTE);
    await openEditDrawer(9);
    await user.click(screen.getByTestId("dry-run-button"));
    const verdict = await screen.findByTestId("robots-verdict");
    const triple = {
      allowed: verdict.getAttribute("data-robots-allowed"),
      rule: screen.getByTestId("robots-rule").textContent,
      totalLinks: screen.getByTestId("dry-run-count").getAttribute("data-total-links"),
      renderedLinks: screen.getAllByTestId(/^dry-run-link-\d+$/).length,
    };
    expect(triple).toEqual({
      allowed: "false",
      rule: "命中规则：Disallow: /search",
      totalLinks: "12",
      renderedLinks: 10,
    });
    unmount();
  });
});
