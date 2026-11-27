import { useMemo } from "react";
import type { IntelRole } from "../types/source";

export interface IntelRoleState {
  role: IntelRole;
  isSupervisor: boolean;
  label: string;
  /** 只读视图不允许任何写操作：新建、编辑、试抓、保存都走这一个开关。 */
  canWrite: boolean;
}

export const SUPERVISOR_ROLE_LABEL = "情报主管";
export const STAFF_ROLE_LABEL = "运营专员";

export const DEFAULT_ROLE_PARAM = "intel_supervisor";

/** 路由参数 ?role=intel_supervisor | intel_staff（也接受 supervisor / staff 简写），默认主管。 */
export function parseRoleParam(raw: string | null | undefined): IntelRole {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "intel_staff" || value === "staff") return "staff";
  return "supervisor";
}

/**
 * 生效角色 = 会话角色与地址栏请求角色的交集（只能降级，不能提权）。
 * 会话是 staff 时，地址栏写什么都是 staff —— 这是防提权的唯一入口。
 */
export function resolveEffectiveRole(sessionRole: IntelRole, requestedRole: IntelRole): IntelRole {
  if (sessionRole === "staff") return "staff";
  return requestedRole;
}

export function buildRoleState(role: IntelRole): IntelRoleState {
  const isSupervisor = role === "supervisor";
  return {
    role,
    isSupervisor,
    label: isSupervisor ? SUPERVISOR_ROLE_LABEL : STAFF_ROLE_LABEL,
    canWrite: isSupervisor,
  };
}

export function useSearchRole(search: string): IntelRoleState {
  return useMemo(() => buildRoleState(parseRoleParam(new URLSearchParams(search).get("role"))), [search]);
}
