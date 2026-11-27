/**
 * 用 Playwright 的 Chromium 对本单 7 个状态逐个截图，并把画面里的关键数值抓成 JSON，
 * 供 scripts/verify-shots.mjs 复核（截图看得见的东西，文本层也能自证）。
 *
 * 前置：npm run build && npm run preview（默认 http://127.0.0.1:4194）
 * 用法：npm run shots
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:4194";
const ROUTE = "/workbench/intel/sources";
const OUT_DIR = path.resolve("shots");
const DUMP = path.resolve("shots", "dom-evidence.json");

const viewport = { width: 1440, height: 1000 };
const evidence = { baseUrl: BASE_URL, route: ROUTE, viewport, deviceScaleFactor: 2, shots: [] };

const browser = await chromium.launch();
await mkdir(OUT_DIR, { recursive: true });

/** TDesign 的 Button 渲染成 div，native disabled 判定无效，统一用类名 + 属性双通道。 */
async function isDisabled(page, selector) {
  return await page.$eval(selector, (node) => node.hasAttribute("disabled") || node.className.includes("t-is-disabled"));
}

async function newPage() {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(String(error)));
  return { page, consoleErrors };
}

async function shot(page, name, options = {}) {
  const file = path.join(OUT_DIR, name + ".png");
  await page.screenshot({ path: file, ...options });
  return "shots/" + name + ".png";
}

async function openDrawer(page, sourceId) {
  await page.goto(BASE_URL + ROUTE + "?role=intel_supervisor&edit=" + sourceId, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="source-drawer-form"]', { timeout: 20000 });
  await page.waitForTimeout(400);
}

async function scrollDrawerTo(page, testId) {
  await page.evaluate((id) => {
    const node = document.querySelector('[data-testid="' + id + '"]');
    if (node) node.scrollIntoView({ block: "center" });
  }, testId);
  await page.waitForTimeout(300);
}

// 1) 列表全貌
{
  const { page, consoleErrors } = await newPage();
  await page.goto(BASE_URL + ROUTE + "?role=intel_supervisor", { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="source-table"]', { timeout: 20000 });
  await page.waitForTimeout(300);
  const file = await shot(page, "list-full", { fullPage: true });
  const rows = await page.$$eval('[data-testid^="source-row-"]', (nodes) => nodes.map((node) => node.getAttribute("data-source-id")));
  const createButton = await page.locator('[data-testid="create-source"]').count();
  const editButtons = await page.locator('[data-testid^="edit-src-"]').count();
  evidence.shots.push({ name: "list-full", file, url: page.url(), rows, createButton, editButtons, consoleErrors });
  console.log("SHOT list-full rows=" + rows.length + " editButtons=" + editButtons + " errors=" + consoleErrors.length);
  await page.close();
}

// 2) AC4 连续失败次数标红：裁出 2 次 / 3 次 / 7 次三行并排的区域
{
  const { page, consoleErrors } = await newPage();
  await page.goto(BASE_URL + ROUTE + "?role=intel_supervisor", { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="source-row-src-002"]', { timeout: 20000 });
  const head = await page.locator('[data-testid="source-table-head"]').boundingBox();
  const last = await page.locator('[data-testid="source-row-src-005"]').boundingBox();
  const top = Math.max(0, (head?.y ?? 0) - 6);
  const clip = {
    x: 0,
    y: top,
    width: viewport.width,
    height: (last ? last.y + last.height : top + 240) - top + 12,
  };
  const file = await shot(page, "ac4-failcount-alert", { clip });
  const cells = await page.$$eval('[data-testid="fail-count"]', (nodes) =>
    nodes.map((node) => ({
      count: node.getAttribute("data-fail-count"),
      level: node.getAttribute("data-fail-level"),
      color: getComputedStyle(node).color,
      weight: getComputedStyle(node).fontWeight,
    })),
  );
  evidence.shots.push({ name: "ac4-failcount-alert", file, url: page.url(), clip, cells, consoleErrors });
  console.log("SHOT ac4-failcount-alert cells=" + JSON.stringify(cells.map((cell) => cell.count + ":" + cell.level)));
  await page.close();
}

// 3) AC3 非主管只读视图
{
  const { page, consoleErrors } = await newPage();
  await page.goto(BASE_URL + ROUTE + "?role=intel_staff&edit=src-003", { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="source-table"]', { timeout: 20000 });
  await page.waitForTimeout(400);
  const file = await shot(page, "ac3-staff-readonly", { fullPage: true });
  const state = {
    role: await page.getAttribute('[data-testid="intel-sources-page"]', "data-role"),
    sessionRole: await page.getAttribute('[data-testid="intel-sources-page"]', "data-session-role"),
    requestedRole: "intel_staff",
    canWrite: await page.getAttribute('[data-testid="intel-sources-page"]', "data-can-write"),
    createButtons: await page.locator('[data-testid="create-source"]').count(),
    editButtons: await page.locator('[data-testid^="edit-src-"]').count(),
    drawerNodes: await page.locator('[data-testid="source-drawer-form"]').count(),
    rows: await page.locator('[data-testid^="source-row-"]').count(),
    roleLabel: await page.textContent('[data-testid="role-label"]'),
  };
  evidence.shots.push({ name: "ac3-staff-readonly", file, url: page.url(), state, consoleErrors });
  console.log("SHOT ac3-staff-readonly " + JSON.stringify(state));
  await page.close();
}

// 4) 抽屉表单（展开高级设置并填入合法 JSON）
{
  const { page, consoleErrors } = await newPage();
  await openDrawer(page, "src-001");
  await page.click('[data-testid="selector-toggle"]');
  const textarea = page.locator('[data-testid="selector-input"]');
  await textarea.fill('{\n  "list": "ul.news-list li",\n  "title": "a.news-title",\n  "date": "span.publish-date"\n}');
  await textarea.blur();
  await page.waitForTimeout(300);
  await scrollDrawerTo(page, "selector-override");
  const file = await shot(page, "drawer-form");
  const state = {
    mode: await page.getAttribute('[data-testid="source-drawer-form"]', "data-mode"),
    selectorStatus: await page.textContent('[data-testid="selector-status"]'),
    hosts: await page.$$eval('[data-testid^="host-tag-"]', (nodes) => nodes.map((node) => node.getAttribute("data-testid").replace("host-tag-", ""))),
    frequency: await page.inputValue('[data-testid="field-frequency"] input'),
    submitDisabled: await isDisabled(page, '[data-testid="drawer-submit"]'),
  };
  evidence.shots.push({ name: "drawer-form", file, url: page.url(), state, consoleErrors });
  console.log("SHOT drawer-form " + JSON.stringify(state));
  await page.close();
}

// 5) AC1 入口地址主机不在允许主机内 → 即时报错
{
  const { page, consoleErrors } = await newPage();
  await openDrawer(page, "src-001");
  const entry = page.locator('[data-testid="entry-input-0"] input');
  await entry.fill("https://other.example.cn/daily-notice");
  await page.waitForTimeout(300);
  await scrollDrawerTo(page, "entry-url-list");
  const file = await shot(page, "ac1-entry-url-error");
  const state = {
    errorText: await page.textContent('[data-testid="entry-error-0"]'),
    rowValid: await page.getAttribute('[data-testid="entry-row-0"]', "data-entry-valid"),
    submitDisabled: await isDisabled(page, '[data-testid="drawer-submit"]'),
    gateText: await page.textContent('[data-testid="drawer-gate"]'),
  };
  evidence.shots.push({ name: "ac1-entry-url-error", file, url: page.url(), state, consoleErrors });
  console.log("SHOT ac1-entry-url-error " + JSON.stringify(state));
  await page.close();
}

// 6) AC2 试抓：允许（12 条解析，展示前 10 条）
{
  const { page, consoleErrors } = await newPage();
  await openDrawer(page, "src-009");
  await page.click('[data-testid="dry-run-button"]');
  await page.waitForSelector('[data-testid="dry-run-result"]', { timeout: 20000 });
  await page.waitForTimeout(300);
  await scrollDrawerTo(page, "dry-run-panel");
  const file = await shot(page, "ac2-dryrun-allowed");
  const state = {
    allowed: await page.getAttribute('[data-testid="robots-verdict"]', "data-robots-allowed"),
    verdict: (await page.textContent('[data-testid="robots-verdict-tag"]'))?.trim(),
    rule: (await page.textContent('[data-testid="robots-rule"]'))?.trim(),
    count: (await page.textContent('[data-testid="dry-run-count"]'))?.trim(),
    totalLinks: await page.getAttribute('[data-testid="dry-run-count"]', "data-total-links"),
    renderedLinks: await page.locator('li[data-testid^="dry-run-link-"]').count(),
    firstLink: await page.getAttribute('[data-testid="dry-run-link-anchor-0"]', "href"),
    lastRenderedLink: await page.getAttribute('[data-testid="dry-run-link-anchor-9"]', "href"),
  };
  evidence.shots.push({ name: "ac2-dryrun-allowed", file, url: page.url(), state, consoleErrors });
  console.log("SHOT ac2-dryrun-allowed " + JSON.stringify(state));
  await page.close();
}

// 7) AC2 试抓：禁止（命中 Disallow: /search）
{
  const { page, consoleErrors } = await newPage();
  await openDrawer(page, "src-010");
  await page.click('[data-testid="dry-run-button"]');
  await page.waitForSelector('[data-testid="dry-run-result"]', { timeout: 20000 });
  await page.waitForTimeout(300);
  await scrollDrawerTo(page, "dry-run-panel");
  const file = await shot(page, "ac2-dryrun-blocked");
  const state = {
    allowed: await page.getAttribute('[data-testid="robots-verdict"]', "data-robots-allowed"),
    verdict: (await page.textContent('[data-testid="robots-verdict-tag"]'))?.trim(),
    rule: (await page.textContent('[data-testid="robots-rule"]'))?.trim(),
    count: (await page.textContent('[data-testid="dry-run-count"]'))?.trim(),
    renderedLinks: await page.locator('li[data-testid^="dry-run-link-"]').count(),
  };
  evidence.shots.push({ name: "ac2-dryrun-blocked", file, url: page.url(), state, consoleErrors });
  console.log("SHOT ac2-dryrun-blocked " + JSON.stringify(state));
  await page.close();
}

await browser.close();
await writeFile(DUMP, JSON.stringify(evidence, null, 2) + "\n", "utf8");
console.log("WROTE " + OUT_DIR);
