/** 请求层使用的租户范围，不依赖 React 或 Zustand。 */
let tenantId: string | null = null;
let revision = 0;
let controller = new AbortController();

export function getTenantScope() {
  return { tenantId, revision, signal: controller.signal };
}

export function setTenantScope(nextTenantId: string | null): void {
  if (tenantId === nextTenantId) return;
  tenantId = nextTenantId;
  revision += 1;
  controller.abort();
  controller = new AbortController();
}
