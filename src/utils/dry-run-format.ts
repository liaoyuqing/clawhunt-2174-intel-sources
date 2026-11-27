import type { DryRunLink, DryRunResult } from "../types/source";

/** 试抓结果只展示前 10 条链接（需求原文），常量集中在本文件，界面不许再写魔法数。 */
export const DRY_RUN_LINK_LIMIT = 10;

export interface DryRunSummary {
  robotsAllowed: boolean;
  verdictText: string;
  verdictTheme: "success" | "danger";
  ruleText: string | null;
  ruleLabel: string;
  robotsUrl: string;
  totalLinks: number;
  shownLinks: DryRunLink[];
  hiddenLinks: number;
  hasMore: boolean;
  noticeText: string;
}

export function summarizeDryRun(result: DryRunResult, limit: number = DRY_RUN_LINK_LIMIT): DryRunSummary {
  const robotsAllowed = result.robots.allowed;
  const totalLinks = result.links.length;
  const shownLinks = result.links.slice(0, limit);
  const hiddenLinks = Math.max(0, totalLinks - shownLinks.length);
  const hasMore = hiddenLinks > 0;
  return {
    robotsAllowed,
    verdictText: robotsAllowed ? "允许抓取" : "禁止抓取",
    verdictTheme: robotsAllowed ? "success" : "danger",
    ruleText: result.robots.rule,
    ruleLabel: result.robots.rule ? "命中规则：" + result.robots.rule : "未命中禁止规则",
    robotsUrl: result.robots.robotsUrl,
    totalLinks,
    shownLinks,
    hiddenLinks,
    hasMore,
    noticeText: hasMore
      ? "共解析 " + totalLinks + " 条，展示前 " + shownLinks.length + " 条"
      : "共解析 " + totalLinks + " 条，全部展示",
  };
}
