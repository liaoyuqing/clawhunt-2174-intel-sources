/**
 * 入口地址与「允许主机」白名单的匹配。
 *
 * 匹配口径（README「三、允许主机的匹配口径」逐字写明）：
 * 1. 精确匹配：允许主机 `a.example.cn` 只匹配 host 完全等于 `a.example.cn`；
 * 2. 通配匹配：`*.example.cn` 只匹配 `example.cn` 的子域（`a.example.cn`、`a.b.example.cn`），
 *    **不匹配**裸域 `example.cn`（裸域要单独列一条精确项）；
 * 3. 不做隐式后缀匹配：允许 `example.cn` 不会放行 `a.example.cn`；
 * 4. 端口不参与比较：`https://a.example.cn:8443/x` 与 `https://a.example.cn/x` 视为同一 host；
 * 5. 大小写与尾部点归一化后比较；
 * 6. 只接受 http / https；带 userinfo（`user:pass@`）的地址一律拒绝，避免 `gov.example.cn@evil.example` 这类混淆。
 */

export type HostErrorCode =
  | "empty"
  | "invalid-url"
  | "protocol-not-allowed"
  | "credentials-not-allowed"
  | "host-not-allowed";

export interface HostCheckOk {
  ok: true;
  host: string;
  rule: string;
}

export interface HostCheckFail {
  ok: false;
  host: string | null;
  code: HostErrorCode;
  message: string;
}

export type HostCheckResult = HostCheckOk | HostCheckFail;

export const ALLOWED_PROTOCOLS = ["http:", "https:"] as const;

export function normalizeHost(raw: string): string {
  let host = raw.trim().toLowerCase();
  if (host.endsWith(".")) {
    host = host.replace(/\.+$/, "");
  }
  if (host.startsWith("[")) {
    return host;
  }
  const portIndex = host.lastIndexOf(":");
  if (portIndex > 0) {
    host = host.slice(0, portIndex);
  }
  return host;
}

export interface HostMatch {
  ok: boolean;
  rule: string;
}

export function matchAllowedHost(host: string, allowedHosts: string[]): HostMatch {
  const target = normalizeHost(host);
  if (!target) {
    return { ok: false, rule: "" };
  }
  for (const entry of allowedHosts) {
    const rule = normalizeHost(entry);
    if (!rule) continue;
    if (rule.startsWith("*.")) {
      const base = rule.slice(2);
      if (!base) continue;
      if (target.endsWith("." + base) && target.length > base.length + 1) {
        return { ok: true, rule };
      }
      continue;
    }
    if (target === rule) {
      return { ok: true, rule };
    }
  }
  return { ok: false, rule: "" };
}

export function checkEntryUrl(raw: string, allowedHosts: string[]): HostCheckResult {
  const text = raw.trim();
  if (!text) {
    return { ok: false, host: null, code: "empty", message: "入口地址不能为空" };
  }
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    return {
      ok: false,
      host: null,
      code: "invalid-url",
      message: "入口地址必须是完整 URL，并以 http:// 或 https:// 开头",
    };
  }
  if (!(ALLOWED_PROTOCOLS as readonly string[]).includes(parsed.protocol)) {
    return {
      ok: false,
      host: null,
      code: "protocol-not-allowed",
      message: "只支持 http 或 https 协议，当前为 " + parsed.protocol.replace(":", ""),
    };
  }
  if (parsed.username !== "" || parsed.password !== "") {
    return {
      ok: false,
      host: parsed.hostname,
      code: "credentials-not-allowed",
      message: "地址不能携带用户名或口令（userinfo），请只保留主机与路径",
    };
  }
  const host = normalizeHost(parsed.hostname);
  if (!host) {
    return { ok: false, host: null, code: "invalid-url", message: "URL 里没有解析出主机" };
  }
  const match = matchAllowedHost(host, allowedHosts);
  if (!match.ok) {
    return {
      ok: false,
      host,
      code: "host-not-allowed",
      message: "主机 " + host + " 不在允许主机内",
    };
  }
  return { ok: true, host, rule: match.rule };
}
