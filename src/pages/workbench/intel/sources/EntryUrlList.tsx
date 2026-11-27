import { Button, Input } from "tdesign-react";
import { checkEntryUrl, type HostCheckResult } from "../../../../utils/host-match";

export interface EntryUrlListProps {
  value: string[];
  allowedHosts: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  checks?: HostCheckResult[];
}

/** 入口地址可多条，逐条独立校验、逐条在行内报错（哪一条错就标哪一条）。 */
export function EntryUrlList({ value, allowedHosts, onChange, disabled = false, checks }: EntryUrlListProps) {
  const results = checks ?? value.map((url) => checkEntryUrl(url, allowedHosts));

  function update(index: number, next: string) {
    const draft = [...value];
    draft[index] = next;
    onChange(draft);
  }

  function remove(index: number) {
    const draft = value.filter((_, cursor) => cursor !== index);
    onChange(draft.length > 0 ? draft : [""]);
  }

  return (
    <div className="entry-list" data-testid="entry-url-list">
      {value.map((url, index) => {
        const result = results[index];
        const bad = result ? !result.ok : false;
        return (
          <div
            className={"entry-row" + (bad ? " entry-row--invalid" : "")}
            key={index}
            data-testid={"entry-row-" + index}
            data-entry-valid={bad ? "false" : "true"}
          >
            <div className="entry-row__control">
              <Input
                data-testid={"entry-input-" + index}
                value={url}
                disabled={disabled}
                placeholder="https://www.gov.example.cn/notice/index.html"
                status={bad ? "error" : undefined}
                onChange={(next) => update(index, String(next))}
              />
              <Button
                data-testid={"entry-remove-" + index}
                size="small"
                variant="text"
                disabled={disabled || value.length <= 1}
                onClick={() => remove(index)}
              >
                删除
              </Button>
            </div>
            {result && !result.ok ? (
              <p className="entry-row__error" data-testid={"entry-error-" + index}>
                {result.message}
              </p>
            ) : null}
            {!bad && result && result.ok ? (
              <p className="entry-row__ok" data-testid={"entry-ok-" + index}>
                主机 {result.host} 命中允许主机 {result.rule}
              </p>
            ) : null}
          </div>
        );
      })}
      <Button
        className="entry-add"
        data-testid="entry-add"
        size="small"
        disabled={disabled}
        onClick={() => onChange([...value, ""])}
      >
        添加入口地址
      </Button>
    </div>
  );
}
