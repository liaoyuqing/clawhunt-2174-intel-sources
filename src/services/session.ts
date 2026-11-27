import type { IntelRole } from "../types/source";

/**
 * 当前登录账号的会话。真实部署里角色必须由服务端会话决定，前端只渲染服务端给的结论：
 *   对接点：GET /api/v1/auth/me → { id, name, role, org_id }
 * 本单没有后端，这里返回固定的 mock 会话（主管），页面启动时读一次。
 *
 * 安全模型（README 第三节与交付正文 AC3 段落逐字写明）：
 * 1. 生效角色 = min(会话角色, 地址栏请求的角色) —— 地址栏只能**降级**，永远不能提权；
 * 2. 只读视图只是界面便利，不是安全边界：写接口必须在服务端按会话角色再校验一次；
 * 3. 因此把 ?role=intel_supervisor 拼到只读账号的地址上，界面上仍然看不到任何写入口。
 */
export const SESSION_API = "GET /api/v1/auth/me";

export interface IntelSession {
  id: string;
  name: string;
  role: IntelRole;
}

export async function loadSession(): Promise<IntelSession> {
  return { id: "u-demo-01", name: "演示账号", role: "supervisor" };
}
