import { useState } from "react";
import { Button, Input, Tag } from "tdesign-react";
import { normalizeHost } from "../../../../utils/host-match";

export interface AllowedHostsInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  invalid?: boolean;
  onDuplicate?: (host: string) => void;
}

/** 标签输入：回车添加、每枚标签上的 × 删除；重复主机去重并回调提示。 */
export function AllowedHostsInput({ value, onChange, disabled = false, invalid = false, onDuplicate }: AllowedHostsInputProps) {
  const [text, setText] = useState("");
  const [dupHint, setDupHint] = useState<string | null>(null);

  function commit() {
    const host = normalizeHost(text);
    if (!host) return;
    if (value.includes(host)) {
      setDupHint("主机 " + host + " 已在列表中，重复项已忽略");
      onDuplicate?.(host);
      setText("");
      return;
    }
    setDupHint(null);
    onChange([...value, host]);
    setText("");
  }

  function remove(host: string) {
    setDupHint(null);
    onChange(value.filter((item) => item !== host));
  }

  return (
    <div className={"hosts-input" + (invalid ? " hosts-input--invalid" : "")} data-testid="allowed-hosts">
      <div className="hosts-input__tags" data-testid="allowed-hosts-tags">
        {value.map((host) => (
          <Tag
            key={host}
            className="host-tag"
            data-testid={"host-tag-" + host}
            closable={!disabled}
            onClose={() => remove(host)}
          >
            {host}
          </Tag>
        ))}
        {value.length === 0 ? (
          <span className="hosts-input__empty">还没有允许主机，至少添加 1 个</span>
        ) : null}
      </div>
      <div className="hosts-input__row">
        <Input
          data-testid="allowed-hosts-field"
          value={text}
          disabled={disabled}
          placeholder="输入主机名后按回车，如 gov.example.cn 或 *.assoc.example.cn"
          onChange={(next) => setText(String(next))}
          onKeydown={(_, context) => {
            if (context.e.key === "Enter") {
              commit();
            }
          }}
        />
        <Button data-testid="allowed-hosts-add" size="small" disabled={disabled} onClick={commit}>
          添加
        </Button>
      </div>
      {dupHint ? (
        <p className="field-hint field-hint--warn" data-testid="allowed-hosts-duplicate">
          {dupHint}
        </p>
      ) : null}
      <p className="field-hint">支持精确主机与 *.example.cn 通配（通配只匹配子域，不含裸域）</p>
    </div>
  );
}
