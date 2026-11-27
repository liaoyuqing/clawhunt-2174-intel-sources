# 情报来源白名单配置页（Workbench · Intel Sources）

会员空间平台工作台的「情报简报 → 情报来源」配置页：`/workbench/intel/sources`。

- 栈：React 18.3 + TypeScript 5.9 + **TDesign React 1.19** + Vite 7 + Vitest 3 + @testing-library/react（jsdom）+ Playwright 1.65（截图）
- 接口：**全部 mock**，本仓库没有后端。数据在 `src/services/mock/`，取数与试抓在 `src/services/sources.ts`
- 页面不是单页 demo 的落地页：路由固定为 `/workbench/intel/sources`，其它路径 302 到该路由（前端 `<Navigate replace />`）
- 本仓库所有域名（`gov.example.cn` / `dongling.gov.example.cn` / `assoc.example.cn` / `im.example.cn` / `media.example.cn` / `biz.example.cn` / `citybiz.example.cn` / `newecon.example.cn` 等）与人名均为虚构测试数据，不含任何真实个人信息或企业信息，也不出现客户名称。

## 一、依赖与运行环境

**需要**：Node.js ≥ 20（实测 v26.13.1）、npm 11（实测 11.20.0）、一个能跑 Chromium 的桌面环境（只有重现截图时需要；Playwright 用本机已安装的 Chromium，脚本不会自己下载浏览器）。

**不需要**：后端服务、数据库、Redis、任何 API Key、任何环境变量、任何向境外发送数据的 SDK。页面启动后只读仓库内的 JSON。

```bash
# 1) 装依赖（实测 196 个包，约 56 秒）
npm install
# 预期输出末尾：added 196 packages in 56s

# 2) 起开发服务器
npm run dev
# 预期输出：VITE v7.3.8  ready in ... ms
#           ➜  Local:   http://localhost:5194/   （端口在 vite.config.ts 固定 5194 + strictPort）
# 打开 http://localhost:5194/workbench/intel/sources

# 3) 一条命令跑完 类型检查 → 单元测试 → 生产构建，并把输出落到 docs/checks/
npm run verify
# 预期输出（逐行，末行固定）：
#   [01-typecheck] EXIT=0 3.8s
#   [02-tests] EXIT=0 31.8s  Tests  50 passed (50) | ...
#   [03-build] EXIT=0 29.6s  ✓ built in 27.45s
#   VERIFY=PASS

# 4) 单独跑测试
npm run test:run
# 预期输出：Test Files  7 passed (7) / Tests  50 passed (50)，Exit code 0

# 5) 生产构建 + 预览（截图用构建产物）
npm run build && npm run preview
# 预期输出：➜  Local:  http://localhost:4194/

# 6) 截图 + 自检（见第四节；需先 build && preview）
npm run evidence:shots
# 预期输出：
#   [04-shots.log] EXIT=0  WROTE <repo>/shots
#   [05-verify-shots.log] EXIT=0  VERIFY_SHOTS=PASS
#   [06-evidence-logs.log] EXIT=0  WROTE ac1-entry-url.log / ac2-dryrun.log / ...
# 分步跑：npm run shots → npm run verify:shots → npm run evidence
```

一条命令的等价形式：`npm run verify` = `npx tsc --noEmit` → `npx vitest run --reporter=verbose` → `npx vite build`，每步原始输出写进 `docs/checks/01-typecheck.log`、`02-tests.log`、`03-build.log`，每份日志末行是 `EXIT=...`。

## 二、路由与角色开关

### 2.1 角色从哪来（地址栏不是权限来源）

生效角色由**会话**决定，不由地址栏决定。实现分两处：

- `src/services/session.ts`：`loadSession()` 返回当前账号会话 `{ id, name, role }`。本单没有后端，返回固定 mock 会话（`{ id: "u-demo-01", name: "演示账号", role: "supervisor" }`）；真实部署把函数体换成 `SESSION_API = "GET /api/v1/auth/me"` 的响应即可，页面其余代码一行不用改。
- `src/hooks/useIntelRole.ts` 的 `resolveEffectiveRole(sessionRole, requestedRole)`：会话角色是 `staff` 时**恒返回 `staff`**，只有会话本身是 `supervisor` 时才采用地址栏请求的 `staff`。也就是说地址栏只能把主管**降级**成只读视图（用于演示/评审），**不能把只读账号提权**。

页面根节点同时暴露 `data-session-role`（会话给的）与 `data-role`（最终生效的）两个属性，`npm run shots` 把两者一起读进证据，所以「降级生效、提权无效」是可机器核对的，而不是一句声明。

只读视图是**界面便利，不是安全边界**：真实部署里所有写接口必须在服务端按会话角色再校验一次（本单无后端，故只有前端这一层演示逻辑）。

### 2.2 路由参数

| 地址 | 作用 |
| --- | --- |
| `/workbench/intel/sources` | 会话为主管时的默认视图：新建按钮 1 个，每行 1 个「编辑」按钮 |
| `/workbench/intel/sources?role=intel_staff` | 请求只读视图：会话为主管时降级生效，新建与编辑按钮都不渲染，列表照常可看 |
| `/workbench/intel/sources?role=intel_supervisor` | 对只读会话**无效**：仍渲染只读视图，`data-role` 仍是 `staff` |
| `/workbench/intel/sources?edit=src-003` | 深链编辑（仅生效角色为主管时有效；只读时该参数被忽略，抽屉节点数为 0） |
| `/workbench/intel/sources?...&mock=dry-run-blocked` | 试抓样例开关（也接受 `allowed`），等价于把入口主机改成 `biz.example.cn` |

`?role=` 接受 `intel_supervisor` / `supervisor` / `intel_staff` / `staff`（大小写不敏感），**未知值回落主管**，缺省为主管。单元测试 `tests/role-visibility.spec.tsx` 里有专门一条「会话 staff + 地址栏 supervisor」的反向用例：`create-source` 节点数 0、`edit-src-*` 节点数 0、抽屉节点 null、`data-session-role` 仍为 `staff`。

## 三、允许主机的匹配口径（AC1 的判定根基）

实现在 `src/utils/host-match.ts` 的 `checkEntryUrl(url, allowedHosts)`，四条规则逐字如下：

1. **精确匹配**：允许 `a.example.cn` 只匹配 host 恰好是 `a.example.cn` 的地址。
2. **通配匹配**：`*.example.cn` 只匹配 `example.cn` 的子域（`a.example.cn`、`a.b.example.cn`），**不放行裸域 `example.cn`**——裸域要单独列一条精确项。伪后缀（`evilexample.cn`）不算子域。
3. **默认不做隐式后缀匹配**：允许 `example.cn` **不会**放行 `a.example.cn`。这是本次选定的口径（后缀匹配在白名单场景里会把整棵子域树一并放开，不接受）。
4. **归一化**：比较前统一小写、去尾部点、**去端口**（`https://www.example.cn:8443/a` 与 443/80 视为同一 host）。

另外两条拒绝规则：只接受 `http` / `https`（`ftp:`、`javascript:` 报 `protocol-not-allowed`）；带 userinfo 的地址（`https://gov.example.cn@evil.example/x`、`user:pass@`）一律报 `credentials-not-allowed`，防「看起来在白名单、实际指向别处」的混淆。空串报 `empty`，非完整 URL 报 `invalid-url`（`www.gov.example.cn/notice` 没有协议头会被拒）。

入口地址是**多条**的：每一条独立调用同一个函数，错误只落在出错的那一行（`data-entry-valid="false"` + 行内红字），不会只给一句总错误。

## 四、如何重现截图（真截图，非示意图）

`scripts/screenshot.mjs` 用 Playwright 的 Chromium（headless）以 1440×1000 视口、`deviceScaleFactor=2` 截 7 张 PNG，**同一时刻**还把画面里的关键数值从真实 DOM 读出来写进 `shots/dom-evidence.json`；`scripts/verify-shots.mjs` 再逐条复核「PNG 魔数 + 字节数 + 控制台零错误 + 数值等于断言」，`scripts/evidence-logs.mjs` 把同样的数值落成 `docs/checks/ac*.log`。

```bash
npm run build && npm run preview   # 终端 A，端口 4194
npm run shots                      # 终端 B
npm run verify:shots
```

| 文件 | 画面里有什么（可核对的具体数值/文案） |
| --- | --- |
| `shots/list-full.png` | 12 行来源、9 列表头（来源名称 / 类型 / 根域名 / 地区层级 / 抓取频率 / 状态 / 最近成功时间 / 连续失败次数 / 负责人）、三种类型标签颜色互异、顶部新建按钮 |
| `shots/ac1-entry-url-error.png` | 抽屉里入口地址填了 `https://other.example.cn/daily-notice`，该行红框 + 红字「主机 other.example.cn 不在允许主机内」，底部「表单校验：未通过，保存按钮已禁用（入口地址错误 1 条）」 |
| `shots/ac2-dryrun-allowed.png` | robots 绿色「robots 允许抓取」+「未命中禁止规则」，计数「共解析 12 条，展示前 10 条」，10 条链接（第 1 条与第 10 条 URL 均可见），末行「另有 2 条未展示」 |
| `shots/ac2-dryrun-blocked.png` | robots 红色「robots 禁止抓取」+「命中规则：Disallow: /search」+ robots.txt 地址，「共解析 12 条，展示前 10 条」 |
| `shots/ac3-staff-readonly.png` | 角色「运营专员」、**没有**新建按钮、每行**没有**编辑按钮、列表 12 行照常渲染；地址栏带 `?edit=src-003` 但无抽屉 |
| `shots/ac4-failcount-alert.png` | 2 次（深灰，不标红）、3 次与 7 次（红色 + 「连续失败」角标）相邻，一眼可对比 |
| `shots/drawer-form.png` | 抽屉表单全貌：允许主机标签、入口地址、抓取方式、抓取频率、地区层级、展开的高级设置与合法 JSON 提示「JSON 合法，共 3 个选择器键」 |

## 五、目录结构

```
src/
  App.tsx / main.tsx                                 路由（/workbench/intel/sources）与入口
  pages/workbench/intel/sources/
    index.tsx                                        页面容器：取数、筛选、会话角色、抽屉与试抓编排
    SourceTable.tsx                                  9 列列表 + 行内编辑按钮（SOURCE_TABLE_COLUMNS 常量）
    FailCountCell.tsx                                FAIL_ALERT_THRESHOLD = 3，data-fail-level + 内联色双通道
    Filters.tsx                                      类型 / 状态 / 地区层级三档筛选
    SourceDrawer.tsx                                 抽屉表单与提交闸门
    AllowedHostsInput.tsx                            允许主机标签输入（回车添加 / × 删除 / 去重提示）
    EntryUrlList.tsx                                 入口地址多条 + 逐条行内报错
    SelectorOverride.tsx                             折叠的高级设置 + JSON 编辑器（失焦校验）
    DryRunPanel.tsx                                  试抓结果：robots 判定 / 命中规则 / 前 10 条链接
  utils/
    host-match.ts                                    AC1 判定点（精确 + 通配，无隐式后缀）
    json-validate.ts                                 选择器 JSON 校验（行列定位、非对象拒绝）
    dry-run-format.ts                                DRY_RUN_LINK_LIMIT = 10 与结果摘要
    draft-validate.ts                                表单闸门（必填 + 逐条入口 + 公开信息勾选）
    source-filter.ts                                 三维度组合筛选（纯函数）
  hooks/useIntelRole.ts                              会话角色 × ?role= 求交（只降级不提权）与 canWrite
  services/session.ts                               会话来源（mock；对接点 GET /api/v1/auth/me）
  services/sources.ts                                mock 取数 / 保存 / 试抓（含真实接口对接点）
  services/mock/*.json                               12 条来源、试抓允许/禁止样例、选择器样例
  constants/intel-options.ts                         类型 / 地区层级 / 频率 / 抓取方式 / 状态选项
  types/source.ts                                    领域类型
tests/                                              7 个 spec 50 用例（见第六节）
scripts/verify.mjs                                   tsc → vitest → vite build，日志落 docs/checks/
scripts/screenshot.mjs                               Playwright 7 张截图 + DOM 证据
scripts/verify-shots.mjs                             截图与数值自检（末行 VERIFY_SHOTS=PASS）
scripts/evidence-logs.mjs                            DOM 证据 → docs/checks/ac*.log
shots/                                               7 张 PNG + dom-evidence.json
docs/checks/                                         真实命令输出与 AC 三元组日志
```

## 六、测试覆盖（7 文件 50 用例）

| 文件 | 用例 | 覆盖点 |
| --- | --- | --- |
| `tests/host-match.spec.ts` | 10 | AC1：完全不在白名单 / 精确命中 / 不做隐式后缀（含反例对照）/ 通配只匹配子域且不放裸域 / 端口归一化 / 协议白名单 / userinfo 混淆 / 大小写与尾部点 / 空串与非完整 URL / 多条逐条独立 |
| `tests/json-validate.spec.ts` | 6 | 空串合法、对象键数、语法错误行列（第 3 行）、数组/字符串/数字/null 拒绝、非字符串值拒绝、行列换算 |
| `tests/dry-run.spec.tsx` | 9 | AC2：摘要纯函数（12→10、文案、禁止规则）、场景路由、?mock= 强制样例、允许场景 UI、禁止场景 UI、链接 target/rel、试抓前后状态、DOM 三元组 |
| `tests/fail-count.spec.tsx` | 5 | AC4：阈值常量、2/3/7 边界、data-fail-level 与颜色双通道、0 灰、列表内 3 与 2 并排、disabled 叠加 |
| `tests/role-visibility.spec.tsx` | 8 | AC3：staff 下 0 按钮且列表仍渲染、supervisor 下 1+12、深链 ?edit= 被忽略、只读无试抓面板、supervisor 对照组、**防提权**（会话 staff + 地址栏 supervisor 仍只读）、`resolveEffectiveRole` 四种组合、参数解析 |
| `tests/form-gate.spec.tsx` | 7 | 入口失配即报错 + 按钮禁用 + 改回恢复、多条逐条定位、公开信息必勾、标签输入增删与去重、频率四档、纯函数闸门、选择器折叠与非法 JSON |
| `tests/filters.spec.tsx` | 5 | 9 列表头逐字、三维度组合筛选、界面切换筛选与计数、从未成功、12 条虚构数据覆盖三类型 |

用例数取值来源：`docs/checks/02-tests.log` 末行区（`Tests  50 passed (50)`）。

## 七、与真实后端的对接点

`src/services/sources.ts` 顶部常量 `SOURCES_API_POINTS` 写明三条待接接口：`GET /api/v1/intel/sources`、`PUT /api/v1/intel/sources/{id}`、`POST /api/v1/intel/sources/{id}/dry-run`。替换这三个函数体即可，返回结构保持 `IntelSource` / `DryRunResult`。抓取调度、robots 判定服务端、解析引擎不在本单范围（本单只做前端与 mock）。
