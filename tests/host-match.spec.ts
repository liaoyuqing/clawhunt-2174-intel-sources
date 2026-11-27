import { describe, expect, it } from "vitest";
import { checkEntryUrl, matchAllowedHost, normalizeHost } from "../src/utils/host-match";

const HOSTS = ["gov.example.cn", "www.gov.example.cn", "*.assoc.example.cn"];

describe("AC1 入口地址主机必须落在允许主机内（纯函数 host-match）", () => {
  it("完全不在白名单：主机不在允许列表时报错并回传主机名", () => {
    const result = checkEntryUrl("https://other.example.cn/list", HOSTS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("host-not-allowed");
      expect(result.host).toBe("other.example.cn");
      expect(result.message).toContain("不在允许主机内");
    }
  });

  it("精确主机命中：gov.example.cn 通过，并回报命中的规则", () => {
    const result = checkEntryUrl("https://gov.example.cn/notice/index.html", HOSTS);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.host).toBe("gov.example.cn");
      expect(result.rule).toBe("gov.example.cn");
    }
  });

  it("备选口径反例：允许 example.cn 不放行 a.example.cn（不做隐式后缀匹配）", () => {
    const result = checkEntryUrl("https://a.example.cn/x", ["example.cn"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("host-not-allowed");
    // 同一份输入换成通配项就通过，证明拒绝来自「不做隐式后缀匹配」而不是别的分支
    expect(checkEntryUrl("https://a.example.cn/x", ["*.example.cn"]).ok).toBe(true);
  });

  it("通配只匹配子域：*.example.cn 通过 a.example.cn 与 a.b.example.cn，不放行裸域 example.cn", () => {
    expect(matchAllowedHost("a.example.cn", ["*.example.cn"]).ok).toBe(true);
    expect(matchAllowedHost("a.b.example.cn", ["*.example.cn"]).ok).toBe(true);
    expect(matchAllowedHost("example.cn", ["*.example.cn"]).ok).toBe(false);
    // 伪后缀不算子域：evil-example.cn 与 example.cn.evil.example 都不许过
    expect(matchAllowedHost("evilexample.cn", ["*.example.cn"]).ok).toBe(false);
  });

  it("端口不参与比较：带 :8443 与默认 443 都算同一 host", () => {
    expect(checkEntryUrl("https://www.gov.example.cn:8443/a", HOSTS).ok).toBe(true);
    expect(checkEntryUrl("http://www.gov.example.cn:80/a", HOSTS).ok).toBe(true);
    expect(checkEntryUrl("https://www.gov.example.cn:8443/a", ["www.gov.example.cn"]).ok).toBe(true);
  });

  it("协议只允许 http / https：ftp 与 javascript 一律报 protocol-not-allowed", () => {
    const ftp = checkEntryUrl("ftp://gov.example.cn/a", HOSTS);
    expect(ftp.ok).toBe(false);
    if (!ftp.ok) expect(ftp.code).toBe("protocol-not-allowed");
    const js = checkEntryUrl("javascript:alert(1)//gov.example.cn", HOSTS);
    expect(js.ok).toBe(false);
    if (!js.ok) expect(js.code).not.toBe("empty");
  });

  it("userinfo 混淆要拒绝：gov.example.cn@evil.example 与 user:pass@ 都报 credentials-not-allowed", () => {
    const confused = checkEntryUrl("https://gov.example.cn@evil.example/path", HOSTS);
    expect(confused.ok).toBe(false);
    if (!confused.ok) {
      expect(confused.code).toBe("credentials-not-allowed");
      expect(confused.host).toBe("evil.example");
    }
    const withPass = checkEntryUrl("https://user:pass@gov.example.cn/a", HOSTS);
    expect(withPass.ok).toBe(false);
    if (!withPass.ok) expect(withPass.code).toBe("credentials-not-allowed");
  });

  it("归一化：大小写与尾部点在比较前折算，WWW.Example.CN. 视为 www.example.cn", () => {
    expect(normalizeHost("WWW.Example.CN.")).toBe("www.example.cn");
    expect(normalizeHost("WWW.Example.CN:443")).toBe("www.example.cn");
    expect(checkEntryUrl("https://WWW.Example.CN:443/a", ["www.example.cn"]).ok).toBe(true);
  });

  it("空串与非法 URL 分别报 empty / invalid-url，不许当成「没填就不校验」", () => {
    const empty = checkEntryUrl("   ", HOSTS);
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.code).toBe("empty");
    const malformed = checkEntryUrl("www.gov.example.cn/notice", HOSTS);
    expect(malformed.ok).toBe(false);
    if (!malformed.ok) expect(malformed.code).toBe("invalid-url");
  });

  it("多条入口逐条独立判定：一条通过不影响另一条被拒", () => {
    const urls = ["https://gov.example.cn/a", "https://evil.example.cn/b", "https://news.assoc.example.cn/c"];
    const results = urls.map((url) => checkEntryUrl(url, HOSTS));
    expect(results.map((item) => item.ok)).toEqual([true, false, true]);
  });
});
