import type { HostCheckResult } from "./host-match";
import { checkEntryUrl } from "./host-match";
import { validateSelectorJson } from "./json-validate";
import type { SourceDraft } from "../types/source";

export interface DraftValidation {
  canSubmit: boolean;
  entryChecks: HostCheckResult[];
  entryErrorCount: number;
  errors: {
    name: string | null;
    rootDomain: string | null;
    allowedHosts: string | null;
    entryUrls: string | null;
    selectors: string | null;
    publicOnlyConfirmed: string | null;
  };
}

const ROOT_DOMAIN_PATTERN = /^(?!-)[a-z0-9-]{1,63}(?:\.(?!-)[a-z0-9-]{1,63})+$/;

/** 表单闸门：所有必填项与逐条入口校验通过、且勾选「只采集公开信息」才允许保存。 */
export function validateDraft(draft: SourceDraft): DraftValidation {
  const entryChecks = draft.entryUrls.map((url) => checkEntryUrl(url, draft.allowedHosts));
  const entryErrorCount = entryChecks.filter((check) => !check.ok).length;
  const selectorResult = validateSelectorJson(draft.selectorsText);

  const errors = {
    name: draft.name.trim() ? null : "来源名称必填",
    rootDomain: ROOT_DOMAIN_PATTERN.test(draft.rootDomain.trim().toLowerCase())
      ? null
      : "根域名必填，且形如 example.cn",
    allowedHosts: draft.allowedHosts.length > 0 ? null : "允许主机至少 1 个",
    entryUrls:
      draft.entryUrls.length === 0
        ? "至少 1 条入口地址"
        : entryErrorCount > 0
          ? "有 " + entryErrorCount + " 条入口地址未通过校验"
          : null,
    selectors: selectorResult.ok ? null : selectorResult.message,
    publicOnlyConfirmed: draft.publicOnlyConfirmed ? null : "新建与编辑都必须勾选「只采集公开信息」",
  };

  const canSubmit = Object.values(errors).every((message) => message === null);

  return { canSubmit, entryChecks, entryErrorCount, errors };
}
