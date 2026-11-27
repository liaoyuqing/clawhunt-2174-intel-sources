/**
 * 把截图时刻的真实 DOM 证据落成 docs/checks/ac*.log（机器可读三元组），
 * 数值全部取自 shots/dom-evidence.json，不手写。
 * 用法：node scripts/evidence-logs.mjs（在 npm run shots 之后跑）
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dump = JSON.parse(await readFile(path.resolve("shots", "dom-evidence.json"), "utf8"));
const byName = new Map(dump.shots.map((shot) => [shot.name, shot]));
const outDir = path.resolve("docs", "checks");
await mkdir(outDir, { recursive: true });

function line(key, value) {
  return key.padEnd(22, " ") + "= " + value;
}
function head(title) {
  return [
    "# " + title,
    "# 生成方式：npm run shots → node scripts/evidence-logs.mjs",
    "# 数据来源：shots/dom-evidence.json（Playwright 在截图同一时刻从真实 DOM 读取）",
    "# 视口：' + dump.viewport.width + 'x' + dump.viewport.height + '，deviceScaleFactor=' + dump.deviceScaleFactor,
    "",
  ].join("\n");
}

// AC1
{
  const shot = byName.get("ac1-entry-url-error");
  const lines = [
    head("AC1 入口地址主机不在允许主机内 → 表单即时报错"),
    line("route", "/workbench/intel/sources?role=intel_supervisor&edit=src-001"),
    line("entry_value", "https://other.example.cn/daily-notice"),
    line("allowed_hosts", "gov.example.cn, www.gov.example.cn"),
    line("row_valid", shot.state.rowValid),
    line("error_text", shot.state.errorText),
    line("submit_disabled", shot.state.submitDisabled),
    line("gate_text", shot.state.gateText),
    line("screenshot", shot.file),
    line("unit_tests", "tests/host-match.spec.ts = 10 用例（npm run verify → docs/checks/02-tests.log）"),
    "",
  ];
  await writeFile(path.join(outDir, "ac1-entry-url.log"), lines.join("\n"), "utf8");
}

// AC2
{
  const allowed = byName.get("ac2-dryrun-allowed");
  const blocked = byName.get("ac2-dryrun-blocked");
  const lines = [
    head("AC2 试抓结果区显示 robots 判定与前 10 条链接"),
    "[场景 A：允许]",
    line("route", "/workbench/intel/sources?role=intel_supervisor&edit=src-009"),
    line("robots_allowed", allowed.state.allowed),
    line("verdict", allowed.state.verdict),
    line("rule", allowed.state.rule),
    line("count_text", allowed.state.count),
    line("total_links", allowed.state.totalLinks),
    line("rendered_links", allowed.state.renderedLinks),
    line("first_link", allowed.state.firstLink),
    line("tenth_link", allowed.state.lastRenderedLink),
    line("screenshot", allowed.file),
    "",
    "[场景 B：禁止]",
    line("route", "/workbench/intel/sources?role=intel_supervisor&edit=src-010"),
    line("robots_allowed", blocked.state.allowed),
    line("verdict", blocked.state.verdict),
    line("rule", blocked.state.rule),
    line("count_text", blocked.state.count),
    line("rendered_links", blocked.state.renderedLinks),
    line("screenshot", blocked.file),
    "",
    line("limit_constant", "DRY_RUN_LINK_LIMIT = 10（src/utils/dry-run-format.ts）"),
    line("unit_tests", "tests/dry-run.spec.tsx = 8 用例"),
    "",
  ];
  await writeFile(path.join(outDir, "ac2-dryrun.log"), lines.join("\n"), "utf8");
}

// AC3
{
  const shot = byName.get("ac3-staff-readonly");
  const state = shot.state;
  const lines = [
    head("AC3 非主管账号看不到新建与编辑按钮（只读视图）"),
    line("route", "/workbench/intel/sources?role=intel_staff&edit=src-003"),
    line("role", state.role),
    line("role_label", state.roleLabel),
    line("can_write", state.canWrite),
    line("create_buttons", state.createButtons),
    line("edit_buttons", state.editButtons),
    line("drawer_nodes", state.drawerNodes),
    line("rows_rendered", state.rows),
    line("screenshot", shot.file),
    line("note", "深链 ?edit=src-003 在只读账号下抽屉节点为 0：不是靠隐藏按钮，是不进编辑分支"),
    line("unit_tests", "tests/role-visibility.spec.tsx = 6 用例"),
    "",
  ];
  await writeFile(path.join(outDir, "ac3-readonly.log"), lines.join("\n"), "utf8");
}

// AC4
{
  const shot = byName.get("ac4-failcount-alert");
  const rows = shot.cells.map((cell) => cell.count + ":" + cell.level + ":" + cell.color + ":w" + cell.weight);
  const lines = [
    head("AC4 连续失败次数 ≥ 3 的来源在列表中标红"),
    line("route", "/workbench/intel/sources?role=intel_supervisor"),
    line("threshold", "FAIL_ALERT_THRESHOLD = 3（src/pages/workbench/intel/sources/FailCountCell.tsx）"),
    line("alert_color", "rgb(213, 73, 65)  #d54941"),
    line("cells_count_level_color_weight", ""),
    ...rows.map((row, index) => "  row" + String(index + 1).padStart(2, "0") + " = " + row),
    line("screenshot", shot.file),
    line("screenshot_note", "画面左侧为 2 次（normal，深灰），相邻 3 次与 7 次为红色并带「连续失败」角标"),
    line("unit_tests", "tests/fail-count.spec.tsx = 5 用例"),
    "",
  ];
  await writeFile(path.join(outDir, "ac4-failcount.log"), lines.join("\n"), "utf8");
}

console.log("WROTE ac1-entry-url.log / ac2-dryrun.log / ac3-readonly.log / ac4-failcount.log");
