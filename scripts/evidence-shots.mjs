/**
 * 跑截图 + 自检并把真实输出落进 docs/checks/04-shots.log 与 05-verify-shots.log。
 * 前置：npm run build && npm run preview（端口 4194）
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

const steps = [
  { log: "04-shots.log", script: "scripts/screenshot.mjs" },
  { log: "05-verify-shots.log", script: "scripts/verify-shots.mjs" },
  { log: "06-evidence-logs.log", script: "scripts/evidence-logs.mjs" },
];

for (const step of steps) {
  const result = spawnSync(process.execPath, [step.script], { encoding: "utf8" });
  const body = ["$ node " + step.script, "", result.stdout ?? "", result.stderr ?? "", "EXIT=" + result.status].join("\n");
  writeFileSync(path.resolve("docs", "checks", step.log), body, "utf8");
  const lines = (result.stdout ?? "").trim().split("\n");
  console.log("[" + step.log + "] EXIT=" + result.status + "  " + lines.slice(-1)[0]);
}
