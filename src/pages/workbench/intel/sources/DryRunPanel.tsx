import { Button, Tag } from "tdesign-react";
import type { DryRunResult } from "../../../../types/source";
import { DRY_RUN_LINK_LIMIT, summarizeDryRun } from "../../../../utils/dry-run-format";

export interface DryRunPanelProps {
  result: DryRunResult | null;
  running: boolean;
  error: string | null;
  onRun: () => void;
  disabled?: boolean;
}

/** 试抓结果区：robots 判定（允许 / 禁止 + 命中规则）、解析链接数、前 10 条链接。 */
export function DryRunPanel({ result, running, error, onRun, disabled = false }: DryRunPanelProps) {
  const summary = result ? summarizeDryRun(result) : null;

  return (
    <section className="dry-run" data-testid="dry-run-panel">
      <div className="dry-run__head">
        <h4 className="dry-run__title">试抓（dry-run，只读不落库）</h4>
        <Button
          data-testid="dry-run-button"
          size="small"
          theme="primary"
          variant="outline"
          loading={running}
          disabled={disabled || running}
          onClick={onRun}
        >
          试抓
        </Button>
      </div>

      {error ? (
        <p className="field-hint field-hint--error" data-testid="dry-run-error">
          {error}
        </p>
      ) : null}

      {!result && !running && !error ? (
        <p className="field-hint" data-testid="dry-run-idle">
          点击「试抓」查看 robots 判定与解析结果
        </p>
      ) : null}

      {summary ? (
        <div className="dry-run__result" data-testid="dry-run-result">
          <div
            className={"robots-verdict robots-verdict--" + (summary.robotsAllowed ? "allowed" : "blocked")}
            data-testid="robots-verdict"
            data-robots-allowed={summary.robotsAllowed ? "true" : "false"}
          >
            <Tag theme={summary.verdictTheme} size="medium" variant="light" data-testid="robots-verdict-tag">
              robots {summary.verdictText}
            </Tag>
            <span className="robots-verdict__rule" data-testid="robots-rule">
              {summary.ruleLabel}
            </span>
            <span className="robots-verdict__url" data-testid="robots-url">
              {summary.robotsUrl}
            </span>
          </div>

          <p className="dry-run__count" data-testid="dry-run-count" data-total-links={String(summary.totalLinks)}>
            {summary.noticeText}
          </p>

          <ol className="dry-run__links" data-testid="dry-run-links">
            {summary.shownLinks.map((link, index) => (
              <li key={link.url} data-testid={"dry-run-link-" + index}>
                <a href={link.url} target="_blank" rel="noopener noreferrer" data-testid={"dry-run-link-anchor-" + index}>
                  {link.title}
                </a>
                <code className="dry-run__link-url">{link.url}</code>
              </li>
            ))}
          </ol>

          <p className="field-hint" data-testid="dry-run-limit-note">
            链接最多展示前 {DRY_RUN_LINK_LIMIT} 条；本次渲染 {summary.shownLinks.length} 条
            {summary.hasMore ? "，另有 " + summary.hiddenLinks + " 条未展示" : ""}。
          </p>
          <p className="field-hint" data-testid="dry-run-meta">
            robots.txt 抓取于 {summary.robotsUrl}，解析耗时 {result?.durationMs ?? 0} ms
          </p>
        </div>
      ) : null}
    </section>
  );
}
