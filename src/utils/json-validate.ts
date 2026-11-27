export type SelectorJsonErrorCode = "syntax" | "not-object";

export interface SelectorJsonOk {
  ok: true;
  empty: boolean;
  value: Record<string, string>;
  keys: number;
}

export interface SelectorJsonFail {
  ok: false;
  code: SelectorJsonErrorCode;
  message: string;
  line: number | null;
  column: number | null;
}

export type SelectorJsonResult = SelectorJsonOk | SelectorJsonFail;

export function locatorFromPosition(text: string, position: number): { line: number; column: number } {
  const safe = Math.max(0, Math.min(position, text.length));
  const before = text.slice(0, safe);
  const line = before.split("\n").length;
  const column = safe - (before.lastIndexOf("\n") + 1) + 1;
  return { line, column };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describeType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "数组";
  return typeof value;
}

/**
 * 「选择器覆盖」JSON 校验：空串视为不覆盖（合法），否则必须是 JSON 对象。
 * 语法错误返回行列位置（1 基），非对象返回类型说明。
 */
export function validateSelectorJson(text: string): SelectorJsonResult {
  const raw = text.trim();
  if (!raw) {
    return { ok: true, empty: true, value: {}, keys: 0 };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const matched = /at position (\d+)/.exec(message);
    const position = matched?.[1] === undefined ? null : Number(matched[1]);
    const location = position === null ? { line: null, column: null } : locatorFromPosition(raw, position);
    return {
      ok: false,
      code: "syntax",
      message:
        "JSON 语法错误" +
        (location.line === null ? "" : "（第 " + location.line + " 行第 " + location.column + " 列）") +
        "：" +
        message,
      line: location.line,
      column: location.column,
    };
  }
  if (!isPlainObject(parsed)) {
    return {
      ok: false,
      code: "not-object",
      message: "选择器覆盖必须是 JSON 对象，当前是" + describeType(parsed),
      line: null,
      column: null,
    };
  }
  const entries = Object.entries(parsed);
  const value: Record<string, string> = {};
  for (const [key, item] of entries) {
    if (typeof item !== "string") {
      return {
        ok: false,
        code: "not-object",
        message: "选择器 " + key + " 的值必须是字符串",
        line: null,
        column: null,
      };
    }
    value[key] = item;
  }
  return { ok: true, empty: false, value, keys: entries.length };
}
