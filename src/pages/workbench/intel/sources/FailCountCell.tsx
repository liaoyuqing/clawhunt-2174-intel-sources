export const FAIL_ALERT_THRESHOLD = 3;

/** 标红用的是可机检的双通道：data-fail-level 属性 + 内联 color（截图与用例都看得到）。 */
export const FAIL_ALERT_COLOR = "#d54941";
export const FAIL_IDLE_COLOR = "#0f172a";
export const FAIL_ZERO_COLOR = "#94a3b8";

export type FailLevel = "alert" | "normal" | "zero";

export function failLevelOf(failCount: number, threshold: number = FAIL_ALERT_THRESHOLD): FailLevel {
  if (failCount >= threshold) return "alert";
  if (failCount <= 0) return "zero";
  return "normal";
}

export interface FailCountCellProps {
  failCount: number;
  threshold?: number;
}

export function FailCountCell({ failCount, threshold = FAIL_ALERT_THRESHOLD }: FailCountCellProps) {
  const level = failLevelOf(failCount, threshold);
  const color = level === "alert" ? FAIL_ALERT_COLOR : level === "zero" ? FAIL_ZERO_COLOR : FAIL_IDLE_COLOR;
  return (
    <span
      className={"fail-count fail-count--" + level}
      data-testid="fail-count"
      data-fail-level={level}
      data-fail-count={String(failCount)}
      data-threshold={String(threshold)}
      style={{ color, fontWeight: level === "alert" ? 700 : 400 }}
    >
      {failCount}
      {level === "alert" ? (
        <span className="fail-count__hint" data-testid="fail-count-hint">
          连续失败
        </span>
      ) : null}
    </span>
  );
}
