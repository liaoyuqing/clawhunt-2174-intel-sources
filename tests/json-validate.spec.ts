import { describe, expect, it } from "vitest";
import { locatorFromPosition, validateSelectorJson } from "../src/utils/json-validate";

describe("选择器覆盖 JSON 校验", () => {
  it("空串视为未覆盖，合法", () => {
    const result = validateSelectorJson("   ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.empty).toBe(true);
      expect(result.keys).toBe(0);
    }
  });

  it("合法对象返回键数与键值", () => {
    const result = validateSelectorJson('{"list":"ul li","title":"a"}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.keys).toBe(2);
      expect(result.value.list).toBe("ul li");
      expect(result.empty).toBe(false);
    }
  });

  it("语法错误报出 1 基行列位置", () => {
    const broken = '{\n  "list": "ul li"\n  "title": "a"\n}';
    const result = validateSelectorJson(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("syntax");
      expect(result.line).toBe(3);
      expect(result.column).not.toBeNull();
      expect(result.message).toContain("第 " + result.line + " 行");
    }
  });

  it("非对象（数组 / 字符串 / 数字）一律报 not-object", () => {
    for (const text of ['["a","b"]', '"just-a-string"', "42", "null"]) {
      const result = validateSelectorJson(text);
      expect(result.ok, text + " 应被拒绝").toBe(false);
      if (!result.ok) expect(result.code).toBe("not-object");
    }
  });

  it("对象里出现非字符串值也拒绝，并指出键名", () => {
    const result = validateSelectorJson('{"list": 12}');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("not-object");
      expect(result.message).toContain("list");
    }
  });

  it("行列换算：locatorFromPosition 对多行文本给出正确的行与列", () => {
    const text = "aa\nbbb\ncc";
    expect(locatorFromPosition(text, 0)).toEqual({ line: 1, column: 1 });
    expect(locatorFromPosition(text, 3)).toEqual({ line: 2, column: 1 });
    expect(locatorFromPosition(text, 7)).toEqual({ line: 3, column: 1 });
    expect(locatorFromPosition(text, 999)).toEqual({ line: 3, column: 3 });
  });
});
