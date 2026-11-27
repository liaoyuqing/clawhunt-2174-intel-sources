/**
 * 一条命令跑完 类型检查 → 单元测试 → 生产构建，并把每步真实输出落进 docs/checks/。
 * 用法：npm run verify
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const steps = [
  { name: "01-typecheck", log: "01-typecheck.log", cmd: "npx", args: ["tsc", "--noEmit"] },
  { name: "02-tests", log: "02-tests.log", cmd: "npx", args: ["vitest", "run", "--reporter=verbose"] },
  { name: "03-build", log: "03-build.log", cmd: "npx", args: ["vite", "build"] },
];

const outDir = path.resolve("docs", "checks");
mkdirSync(outDir, { recursive: true });

let failed = null;
for (const step of steps) {
  const startedAt = Date.now();
  const result = spawnSync(step.cmd, step.args, { encoding: "utf8", shell: process.platform === "win32" });
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  const body = [
    "$ " + step.cmd + " " + step.args.join(" "),
    "",
    result.stdout ?? "",
    result.stderr ?? "",
    "",
    "EXIT=" + result.status + "  DURATION=" + seconds + "s",
  ].join("\n");
  writeFileSync(path.join(outDir, step.log), body, "utf8");
  const tail = (result.stdout ?? "").trim().split("\n").slice(-3).join(" | ");
  console.log("[" + step.name + "] EXIT=" + result.status + " " + seconds + "s  " + tail);
  if (result.status !== 0 && failed === null) failed = step.name;
}

console.log(failed === null ? "VERIFY=PASS" : "VERIFY=FAIL step=" + failed);
process.exit(failed === null ? 0 : 1);
