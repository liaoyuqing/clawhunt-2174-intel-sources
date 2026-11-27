import { useEffect, useState } from "react";
import { Button, Checkbox, Drawer, Input, Radio, Select } from "tdesign-react";
import {
  FETCH_MODE_OPTIONS,
  FREQUENCY_OPTIONS,
  REGION_OPTIONS,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  type Option,
} from "../../../../constants/intel-options";
import { validateDraft } from "../../../../utils/draft-validate";
import type { DryRunResult, SourceDraft } from "../../../../types/source";
import { AllowedHostsInput } from "./AllowedHostsInput";
import { DryRunPanel } from "./DryRunPanel";
import { EntryUrlList } from "./EntryUrlList";
import { SelectorOverride } from "./SelectorOverride";

type AnyOption = Option<string>;

export interface SourceDrawerProps {
  open: boolean;
  draft: SourceDraft | null;
  mode: "create" | "edit";
  canWrite: boolean;
  dryRun: DryRunResult | null;
  dryRunError: string | null;
  dryRunRunning: boolean;
  onDraftChange: (next: SourceDraft) => void;
  onClose: () => void;
  onSave: (draft: SourceDraft) => void;
  onDryRun: (draft: SourceDraft) => void;
  onDuplicateHost: (host: string) => void;
}

/** 抽屉表单：名称、类型、根域名、允许主机、入口地址、抓取方式、选择器覆盖、频率、地区层级、公开信息确认。 */
export function SourceDrawer(props: SourceDrawerProps) {
  const { open, draft, mode, canWrite, dryRun, dryRunError, dryRunRunning } = props;
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) setSaved(false);
  }, [open]);

  if (!open || !draft) {
    return null;
  }

  const validation = validateDraft(draft);
  const disabled = !canWrite;

  function patch(next: Partial<SourceDraft>) {
    props.onDraftChange({ ...draft, ...next } as SourceDraft);
  }

  return (
    <Drawer
      visible={open}
      size="720px"
      header={mode === "create" ? "新建情报来源" : "编辑情报来源 " + (draft.name || draft.id || "")}
      footer={null}
      closeBtn={canWrite ? true : false}
      closeOnEscKeydown={canWrite}
      closeOnOverlayClick={canWrite}
      onClose={props.onClose}
    >
      <div className="drawer-body" data-testid="source-drawer-form" data-mode={mode}>
        {!canWrite ? (
          <p className="readonly-banner" data-testid="readonly-banner">
            当前账号为非主管只读视图，表单不可编辑、不可保存。
          </p>
        ) : null}

        <label className="field">
          <span className="field__label">来源名称</span>
          <Input
            data-testid="field-name"
            value={draft.name}
            disabled={disabled}
            onChange={(next) => patch({ name: String(next) })}
          />
        </label>

        <label className="field">
          <span className="field__label">类型</span>
          <div data-testid="field-type">
            <Select
              value={draft.type}
              disabled={disabled}
              options={TYPE_OPTIONS as AnyOption[]}
              onChange={(value) => patch({ type: String(value) as SourceDraft["type"] })}
            />
          </div>
        </label>

        <label className="field">
          <span className="field__label">根域名</span>
          <Input
            data-testid="field-root-domain"
            value={draft.rootDomain}
            disabled={disabled}
            placeholder="example.cn"
            onChange={(next) => patch({ rootDomain: String(next) })}
          />
        </label>

        <div className="field">
          <span className="field__label">允许主机（标签输入，至少 1 个）</span>
          <AllowedHostsInput
            value={draft.allowedHosts}
            disabled={disabled}
            invalid={validation.errors.allowedHosts !== null}
            onChange={(next) => patch({ allowedHosts: next })}
            onDuplicate={props.onDuplicateHost}
          />
          {validation.errors.allowedHosts ? (
            <p className="field-hint field-hint--error" data-testid="allowed-hosts-error">
              {validation.errors.allowedHosts}
            </p>
          ) : null}
        </div>

        <div className="field">
          <span className="field__label">入口地址（可多条，逐条校验主机）</span>
          <EntryUrlList
            value={draft.entryUrls}
            allowedHosts={draft.allowedHosts}
            checks={validation.entryChecks}
            disabled={disabled}
            onChange={(next) => patch({ entryUrls: next })}
          />
        </div>

        <div className="field">
          <span className="field__label">抓取方式</span>
          <div className="field__radios" data-testid="field-fetch-mode">
            <Radio.Group
              value={draft.fetchMode}
              disabled={disabled}
              onChange={(value) => patch({ fetchMode: String(value) as SourceDraft["fetchMode"] })}
            >
              {FETCH_MODE_OPTIONS.map((option) => (
                <Radio key={option.value} value={option.value} data-testid={"fetch-mode-" + option.value}>
                  {option.label}
                </Radio>
              ))}
            </Radio.Group>
          </div>
        </div>

        <div className="field">
          <span className="field__label">抓取频率</span>
          <div data-testid="field-frequency">
            <Select
              value={draft.frequency}
              disabled={disabled}
              options={FREQUENCY_OPTIONS as AnyOption[]}
              onChange={(value) => patch({ frequency: String(value) as SourceDraft["frequency"] })}
            />
          </div>
        </div>

        <div className="field">
          <span className="field__label">地区层级</span>
          <div data-testid="field-region">
            <Select
              value={draft.regionLevel}
              disabled={disabled}
              options={REGION_OPTIONS as AnyOption[]}
              onChange={(value) => patch({ regionLevel: String(value) as SourceDraft["regionLevel"] })}
            />
          </div>
        </div>

        <div className="field">
          <span className="field__label">状态</span>
          <div data-testid="field-status">
            <Select
              value={draft.status}
              disabled={disabled}
              options={STATUS_OPTIONS as AnyOption[]}
              onChange={(value) => patch({ status: String(value) as SourceDraft["status"] })}
            />
          </div>
        </div>

        <SelectorOverride
          value={draft.selectorsText}
          disabled={disabled}
          onChange={(next) => patch({ selectorsText: next })}
        />

        <div className="field">
          <Checkbox
            data-testid="field-public-only"
            checked={draft.publicOnlyConfirmed}
            disabled={disabled}
            onChange={(checked) => patch({ publicOnlyConfirmed: checked })}
          >
            只采集公开信息（必勾）
          </Checkbox>
          {!draft.publicOnlyConfirmed ? (
            <p className="field-hint field-hint--warn" data-testid="public-only-hint">
              未勾选「只采集公开信息」时禁止保存
            </p>
          ) : null}
        </div>

        <DryRunPanel
          result={dryRun}
          running={dryRunRunning}
          error={dryRunError}
          disabled={disabled}
          onRun={() => props.onDryRun(draft)}
        />

        <div className="drawer-actions">
          <Button data-testid="drawer-cancel" onClick={props.onClose}>
            取消
          </Button>
          <Button
            data-testid="drawer-submit"
            theme="primary"
            disabled={!canWrite || !validation.canSubmit || saved}
            onClick={() => {
              setSaved(true);
              props.onSave(draft);
            }}
          >
            {mode === "create" ? "创建来源" : "保存变更"}
          </Button>
        </div>
        <p className="field-hint" data-testid="drawer-gate">
          表单校验：{validation.canSubmit ? "通过，可保存" : "未通过，保存按钮已禁用"}
          {validation.entryErrorCount > 0 ? "（入口地址错误 " + validation.entryErrorCount + " 条）" : ""}
        </p>
      </div>
    </Drawer>
  );
}
