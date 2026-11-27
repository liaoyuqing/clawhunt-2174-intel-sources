import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, MessagePlugin } from "tdesign-react";
import { fetchSources, emptyDraft, resolveDryRunScenario, runDryRun, toDraft, draftToSource } from "../../../../services/sources";
import { buildRoleState, parseRoleParam } from "../../../../hooks/useIntelRole";
import { EMPTY_FILTERS, filterSources } from "../../../../utils/source-filter";
import { validateDraft } from "../../../../utils/draft-validate";
import type { DryRunResult, IntelSource, SourceDraft, SourceFilters } from "../../../../types/source";
import { Filters } from "./Filters";
import { SourceDrawer } from "./SourceDrawer";
import { SourceTable } from "./SourceTable";

export interface IntelSourcesPageProps {
  /** 单元测试可注入固定角色；不传则从 ?role= 解析。 */
  roleOverride?: "supervisor" | "staff";
  initialFilters?: SourceFilters;
}

export function IntelSourcesPage({ roleOverride, initialFilters }: IntelSourcesPageProps) {
  const [params, setParams] = useSearchParams();
  const roleState = useMemo(() => {
    if (roleOverride) return buildRoleState(roleOverride);
    return buildRoleState(parseRoleParam(params.get("role")));
  }, [params, roleOverride]);

  const [rows, setRows] = useState<IntelSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SourceFilters>(initialFilters ?? EMPTY_FILTERS);
  const [draft, setDraft] = useState<SourceDraft | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [dryRun, setDryRun] = useState<DryRunResult | null>(null);
  const [dryRunError, setDryRunError] = useState<string | null>(null);
  const [dryRunRunning, setDryRunRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSources().then((data) => {
      if (cancelled) return;
      setRows(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleRows = useMemo(() => filterSources(rows, filters), [rows, filters]);

  const openCreate = useCallback(() => {
    if (!roleState.canWrite) return;
    setMode("create");
    setDryRun(null);
    setDryRunError(null);
    setDraft(emptyDraft(""));
  }, [roleState.canWrite]);

  const openEdit = useCallback(
    (row: IntelSource) => {
      if (!roleState.canWrite) return;
      setMode("edit");
      setDryRun(null);
      setDryRunError(null);
      setDraft(toDraft(row));
    },
    [roleState.canWrite],
  );

  useEffect(() => {
    // 只读账号即使把 ?edit= 塞进地址栏也不打开抽屉：只读不是靠隐藏按钮，而是根本不进编辑分支。
    if (!roleState.canWrite) {
      setDraft(null);
      return;
    }
    const editId = params.get("edit");
    if (!editId || rows.length === 0) return;
    const target = rows.find((row) => row.id === editId);
    if (!target) return;
    setMode("edit");
    setDraft(toDraft(target));
  }, [params, rows, roleState.canWrite]);

  function closeDrawer() {
    setDraft(null);
    setDryRun(null);
    setDryRunError(null);
    const next = new URLSearchParams(params.toString());
    next.delete("edit");
    setParams(next, { replace: true });
  }

  function saveDraft(value: SourceDraft) {
    const validation = validateDraft(value);
    if (!validation.canSubmit) {
      MessagePlugin.warning("表单校验未通过，未保存");
      return;
    }
    const record = draftToSource(value, rows);
    setRows((prev) => {
      const exists = prev.some((row) => row.id === record.id);
      if (!exists) return [record, ...prev];
      return prev.map((row) => (row.id === record.id ? { ...row, ...record, lastSuccessAt: row.lastSuccessAt, failCount: row.failCount } : row));
    });
    closeDrawer();
    MessagePlugin.success(mode === "create" ? "已创建来源 " + record.name : "已保存来源变更");
  }

  async function handleDryRun(value: SourceDraft) {
    setDryRunRunning(true);
    setDryRunError(null);
    try {
      const scenario = resolveDryRunScenario(value.entryUrls[0] ?? "", params.get("mock"));
      const result = await runDryRun(value, scenario);
      setDryRun(result);
    } catch (error) {
      setDryRunError("试抓失败：" + (error instanceof Error ? error.message : String(error)));
      setDryRun(null);
    } finally {
      setDryRunRunning(false);
    }
  }

  return (
    <main className="page" data-testid="intel-sources-page" data-role={roleState.role} data-can-write={roleState.canWrite ? "true" : "false"}>
      <header className="page-head">
        <div>
          <h1 className="page-title" data-testid="page-title">
            情报来源白名单配置
          </h1>
          <p className="page-sub">
            工作台 / 情报简报 / 来源管理 · 当前账号：<strong data-testid="role-label">{roleState.label}</strong>
            {roleState.isSupervisor ? "" : "（只读视图）"}
          </p>
        </div>
        {roleState.canWrite ? (
          <Button data-testid="create-source" theme="primary" onClick={openCreate}>
            新建来源
          </Button>
        ) : null}
      </header>

      <Filters filters={filters} onChange={setFilters} resultCount={visibleRows.length} totalCount={rows.length} />

      {loading ? (
        <p data-testid="sources-loading">正在加载情报来源…</p>
      ) : (
        <SourceTable rows={visibleRows} isSupervisor={roleState.isSupervisor} onEdit={openEdit} />
      )}

      <p className="page-foot" data-testid="page-foot">
        共 {visibleRows.length} 条来源（全部 {rows.length} 条）；连续失败次数 ≥ 3 的行标红。
      </p>

      <SourceDrawer
        open={draft !== null}
        draft={draft}
        mode={mode}
        canWrite={roleState.canWrite}
        dryRun={dryRun}
        dryRunError={dryRunError}
        dryRunRunning={dryRunRunning}
        onDraftChange={setDraft}
        onClose={closeDrawer}
        onSave={saveDraft}
        onDryRun={handleDryRun}
        onDuplicateHost={() => undefined}
      />
    </main>
  );
}

export default IntelSourcesPage;
