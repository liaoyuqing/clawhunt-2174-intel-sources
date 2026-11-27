import { useState } from "react";
import { Textarea } from "tdesign-react";
import { validateSelectorJson } from "../../../../utils/json-validate";

export interface SelectorOverrideProps {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}

/**
 * 「选择器覆盖」放在折叠的高级设置里：展开后是 JSON 文本框，
 * 失焦即校验，语法错误给出行列位置，非对象（数组 / 字符串）也报错。
 */
export function SelectorOverride({ value, onChange, disabled = false }: SelectorOverrideProps) {
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const result = validateSelectorJson(value);
  const showError = touched && !result.ok;

  return (
    <section className="selector-override" data-testid="selector-override" data-open={open ? "true" : "false"}>
      <button
        type="button"
        className="advanced-toggle"
        data-testid="selector-toggle"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? "收起高级设置" : "展开高级设置（选择器覆盖）"}
      </button>
      {open ? (
        <div className="selector-override__body" data-testid="selector-body">
          <p className="field-hint">
            覆盖默认解析规则，JSON 对象的键为抓取步骤（list / title / date / summary），值为选择器字符串；留空表示不覆盖。
          </p>
          <Textarea
            data-testid="selector-input"
            value={value}
            disabled={disabled}
            autosize={{ minRows: 4, maxRows: 10 }}
            placeholder={'{\n  "list": "ul.news-list li",\n  "title": "a.news-title"\n}'}
            onChange={(next) => onChange(String(next))}
            onBlur={() => setTouched(true)}
          />
          {showError ? (
            <p className="field-hint field-hint--error" data-testid="selector-error">
              {result.message}
            </p>
          ) : null}
          {result.ok ? (
            <p className="field-hint" data-testid="selector-status" data-selector-keys={String(result.keys)}>
              {result.empty ? "未覆盖（使用默认解析规则）" : "JSON 合法，共 " + result.keys + " 个选择器键"}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
