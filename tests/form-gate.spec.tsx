import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { openEditDrawer, renderPageReady } from "./helpers";
import { emptyDraft, toDraft } from "../src/services/sources";
import { validateDraft } from "../src/utils/draft-validate";
import { FREQUENCY_OPTIONS } from "../src/constants/intel-options";
import { SAMPLE_ROWS } from "./helpers";

const ROUTE = "/workbench/intel/sources?role=intel_supervisor";

describe("抽屉表单：必填、逐条校验与提交闸门", () => {
  it("入口地址主机不在允许主机内：该行立即报错、提交按钮禁用、改回允许主机后恢复", async () => {
    const user = userEvent.setup();
    await renderPageReady(ROUTE);
    await openEditDrawer(0);

    const submit = screen.getByTestId("drawer-submit");
    expect(submit.hasAttribute("disabled")).toBe(false);

    const input = screen.getByTestId("entry-input-0").querySelector("input") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "https://other.example.cn/list");

    const error = await screen.findByTestId("entry-error-0");
    expect(error.textContent).toContain("other.example.cn");
    expect(error.textContent).toContain("不在允许主机内");
    expect(screen.getByTestId("drawer-submit").hasAttribute("disabled")).toBe(true);
    expect(screen.getByTestId("entry-row-0").getAttribute("data-entry-valid")).toBe("false");

    await user.clear(input);
    await user.type(input, "https://www.gov.example.cn/notice/index.html");
    expect(screen.queryByTestId("entry-error-0")).toBeNull();
    expect(screen.getByTestId("entry-ok-0").textContent).toContain("命中允许主机");
    expect(screen.getByTestId("drawer-submit").hasAttribute("disabled")).toBe(false);
  });

  it("多条入口逐条独立报错：第 1 条错误只标第 1 条，第 0 条保持通过", async () => {
    const user = userEvent.setup();
    await renderPageReady(ROUTE);
    await openEditDrawer(1); // src-002 有两条入口

    const second = screen.getByTestId("entry-input-1").querySelector("input") as HTMLInputElement;
    await user.clear(second);
    await user.type(second, "https://blocked.example.cn/x");

    expect(screen.queryByTestId("entry-error-0")).toBeNull();
    expect(screen.getByTestId("entry-error-1")).toBeInTheDocument();
    expect(screen.getByTestId("entry-row-0").getAttribute("data-entry-valid")).toBe("true");
    expect(screen.getByTestId("entry-row-1").getAttribute("data-entry-valid")).toBe("false");
  });

  it("未勾选「只采集公开信息」时保存禁用，勾选后解锁", async () => {
    const user = userEvent.setup();
    await renderPageReady(ROUTE);
    await openEditDrawer(0);
    const checkbox = screen.getByTestId("field-public-only");

    await user.click(checkbox);
    expect(screen.getByTestId("public-only-hint")).toBeInTheDocument();
    expect(screen.getByTestId("drawer-submit").hasAttribute("disabled")).toBe(true);

    await user.click(checkbox);
    expect(screen.queryByTestId("public-only-hint")).toBeNull();
    expect(screen.getByTestId("drawer-submit").hasAttribute("disabled")).toBe(false);
  });

  it("允许主机标签输入：回车添加、× 删除、重复项去重并给提示", async () => {
    const user = userEvent.setup();
    await renderPageReady(ROUTE);
    await openEditDrawer(0);

    const field = screen.getByTestId("allowed-hosts-field").querySelector("input") as HTMLInputElement;
    await user.clear(field);
    await user.type(field, "extra.example.cn{Enter}");
    expect(screen.getByTestId("host-tag-extra.example.cn")).toBeInTheDocument();

    await user.type(field, "extra.example.cn{Enter}");
    expect(screen.getByTestId("allowed-hosts-duplicate").textContent).toContain("重复");
    expect(screen.getAllByTestId("host-tag-extra.example.cn").length).toBe(1);

    const tags = screen.getByTestId("allowed-hosts-tags");
    const closeBtn = within(tags).getByTestId("host-tag-extra.example.cn").querySelector(".t-tag__icon-close");
    expect(closeBtn).not.toBeNull();
    await user.click(closeBtn as Element);
    expect(screen.queryByTestId("host-tag-extra.example.cn")).toBeNull();
  });

  it("抓取频率下拉恰好 4 档且值为 hourly / 6h / daily / weekly", () => {
    expect(FREQUENCY_OPTIONS.map((option) => option.value)).toEqual(["hourly", "6h", "daily", "weekly"]);
    expect(FREQUENCY_OPTIONS.map((option) => option.label)).toEqual(["1 小时", "6 小时", "每天", "每周"]);
  });

  it("纯函数闸门：空草稿不可提交，逐项错误各就各位", () => {
    const draft = emptyDraft("src-099");
    const result = validateDraft(draft);
    expect(result.canSubmit).toBe(false);
    expect(result.errors.name).toBe("来源名称必填");
    expect(result.errors.allowedHosts).toBe("允许主机至少 1 个");
    expect(result.errors.entryUrls).toBe("有 1 条入口地址未通过校验");
    expect(validateDraft({ ...draft, entryUrls: [] }).errors.entryUrls).toBe("至少 1 条入口地址");
    expect(result.errors.publicOnlyConfirmed).not.toBeNull();

    const fixed = {
      ...toDraft(SAMPLE_ROWS[0]!),
      id: "src-100",
      entryUrls: ["https://www.gov.example.cn/notice/index.html"],
      publicOnlyConfirmed: true,
    };
    expect(validateDraft(fixed).canSubmit).toBe(true);
  });

  it("选择器覆盖：折叠区默认收起，展开是 JSON 文本框，非法 JSON 报行内错误并阻止保存", async () => {
    const user = userEvent.setup();
    await renderPageReady(ROUTE);
    await openEditDrawer(0);

    const section = screen.getByTestId("selector-override");
    expect(section.getAttribute("data-open")).toBe("false");
    expect(screen.queryByTestId("selector-input")).toBeNull();

    await user.click(screen.getByTestId("selector-toggle"));
    expect(section.getAttribute("data-open")).toBe("true");
    const textarea = screen.getByTestId("selector-input") as HTMLTextAreaElement;
    expect(textarea.tagName).toBe("TEXTAREA");

    await user.clear(textarea);
    await user.type(textarea, "{{");
    await user.tab();

    const error = await screen.findByTestId("selector-error");
    expect(error.textContent).toContain("JSON 语法错误");
    expect(error.textContent).toMatch(/第 \d+ 行/);
    expect(screen.getByTestId("drawer-submit").hasAttribute("disabled")).toBe(true);
  });
});
