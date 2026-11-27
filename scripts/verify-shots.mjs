/**
 * 复核截图与画面里的数值：文件是 PNG 且字节数 > 0、DOM 证据三元组与断言一致。
 * 末行输出 VERIFY_SHOTS=PASS 或 FAIL。
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const DUMP = path.resolve("shots", "dom-evidence.json");
const dump = JSON.parse(await readFile(DUMP, "utf8"));
const byName = new Map(dump.shots.map((shot) => [shot.name, shot]));

const REQUIRED = [
  "list-full",
  "ac4-failcount-alert",
  "ac3-staff-readonly",
  "drawer-form",
  "ac1-entry-url-error",
  "ac2-dryrun-allowed",
  "ac2-dryrun-blocked",
];

let failed = 0;
function ok(message) {
  console.log("OK   " + message);
}
function bad(message) {
  failed += 1;
  console.log("FAIL " + message);
}
function check(condition, message) {
  if (condition) ok(message);
  else bad(message);
}

for (const name of REQUIRED) {
  const shot = byName.get(name);
  if (!shot) {
    bad(name + " 缺失于 dom-evidence.json");
    continue;
  }
  const info = await stat(path.resolve(shot.file));
  const head = (await readFile(path.resolve(shot.file))).subarray(0, 8).toString("hex");
  check(head === "89504e470d0a1a0a", name + " 是 PNG（魔数 " + head + "），字节数 " + info.size);
  check(info.size > 20000, name + " 字节数 > 20000（实际 " + info.size + "）");
  check(shot.consoleErrors.length === 0, name + " 控制台错误数 = 0（实际 " + shot.consoleErrors.length + "）");
}

const list = byName.get("list-full");
check(list && list.rows.length === 12, "列表 12 行（实际 " + (list ? list.rows.length : "n/a") + "）");
check(list && list.editButtons === 12, "主管视图编辑按钮 12 个（实际 " + (list ? list.editButtons : "n/a") + "）");
check(list && list.createButton === 1, "主管视图新建按钮 1 个");

const ac4 = byName.get("ac4-failcount-alert");
const cellMap = new Map((ac4?.cells ?? []).map((cell) => [cell.count, cell]));
check(cellMap.get("2")?.level === "normal", "AC4：2 次为 normal");
check(cellMap.get("3")?.level === "alert", "AC4：3 次为 alert，颜色 " + cellMap.get("3")?.color);
check(cellMap.get("7")?.level === "alert", "AC4：7 次为 alert");
check(cellMap.get("3")?.color === "rgb(213, 73, 65)", "AC4：3 次颜色为 rgb(213, 73, 65)");

const ac3 = byName.get("ac3-staff-readonly");
check(ac3?.state.role === "staff", "AC3：生效角色为 staff");
check(ac3?.state.sessionRole === "supervisor", "AC3：会话角色 supervisor 被地址栏降级为 staff（?role=intel_staff）");
check(ac3?.state.canWrite === "false", "AC3：data-can-write=false");
check(ac3?.state.createButtons === 0, "AC3：新建按钮 0 个");
check(ac3?.state.editButtons === 0, "AC3：编辑按钮 0 个");
check(ac3?.state.drawerNodes === 0, "AC3：深链 ?edit=src-003 抽屉节点 0 个");
check(ac3?.state.rows === 12, "AC3：列表仍渲染 12 行");

const ac1 = byName.get("ac1-entry-url-error");
check((ac1?.state.errorText ?? "").includes("不在允许主机内"), "AC1：行内错误文案含「不在允许主机内」：" + ac1?.state.errorText);
check(ac1?.state.rowValid === "false", "AC1：该行 data-entry-valid=false");
check(ac1?.state.submitDisabled === true, "AC1：保存按钮被禁用");

const allowed = byName.get("ac2-dryrun-allowed");
check(allowed?.state.allowed === "true", "AC2（允许）：data-robots-allowed=true");
check((allowed?.state.count ?? "") === "共解析 12 条，展示前 10 条", "AC2（允许）：计数文案「共解析 12 条，展示前 10 条」");
check(allowed?.state.renderedLinks === 10, "AC2（允许）：渲染 10 条链接（实际 " + allowed?.state.renderedLinks + "）");

const blocked = byName.get("ac2-dryrun-blocked");
check(blocked?.state.allowed === "false", "AC2（禁止）：data-robots-allowed=false");
check((blocked?.state.rule ?? "").includes("Disallow: /search"), "AC2（禁止）：命中规则 Disallow: /search：" + blocked?.state.rule);
check(blocked?.state.renderedLinks === 10, "AC2（禁止）：同样只渲染 10 条");

console.log("SHOTS=" + dump.shots.length + " FAILED=" + failed);
console.log(failed === 0 ? "VERIFY_SHOTS=PASS" : "VERIFY_SHOTS=FAIL");
process.exit(failed === 0 ? 0 : 1);
