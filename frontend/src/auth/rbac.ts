/**
 * Frontend RBAC — a UX-only mirror of the backend's authorization rules.
 *
 * Source of truth: `backend/app/services/auth.py::require_roles` and the
 * `Depends(require_roles([...]))` declarations on each router. The backend is
 * the real security boundary; these helpers only decide what to render.
 */

/** Canonical role ids seeded by `backend/app/seed.py`. */
export const ROLE_IDS = [
  'support_l1',
  'sme_senior',
  'content_admin',
  'noc_lead',
  'system_admin',
] as const

export type RoleId = (typeof ROLE_IDS)[number]

/** `require_roles` implicitly always allows system_admin. */
const ALWAYS = 'system_admin'

/**
 * Capability → allowed role ids.
 * Keep each list byte-for-byte aligned with the backend route it protects.
 */
const CAPABILITIES = {
  /** POST /query, GET /query/history, GET /documents, GET /documents/{id} — any authenticated user. */
  runQuery: ROLE_IDS,
  /** POST /query and GET /query/history — available to every authenticated role. */
  viewOwnHistory: ROLE_IDS,
  /** GET /documents — RBAC category filtering happens server-side. */
  viewDocuments: ROLE_IDS,
  /** GET /documents/{id} — includes parsed chunks. */
  viewDocumentDetail: ROLE_IDS,
  /** POST /feedback — rate / flag an answer. */
  submitFeedback: ROLE_IDS,
  /** POST /documents/upload — require_roles(["content_admin", "system_admin"]) */
  uploadDocuments: ['content_admin', ALWAYS] as const,
  /** POST /documents/{id}/deprecate — require_roles(["content_admin", "system_admin"]) */
  deprecateDocuments: ['content_admin', ALWAYS] as const,
  /** GET /feedback/flagged — require_roles(["sme_senior","content_admin","system_admin","noc_lead"]) */
  viewReviewQueue: ['sme_senior', 'content_admin', ALWAYS, 'noc_lead'] as const,
  /** POST /feedback/{id}/review — require_roles(["sme_senior", "system_admin"]) */
  resolveFlags: ['sme_senior', ALWAYS] as const,
  /** GET /analytics/overview — require_roles(["noc_lead","system_admin","content_admin","sme_senior"]) */
  viewAnalytics: ['noc_lead', ALWAYS, 'content_admin', 'sme_senior'] as const,
  /** GET /audit — require_roles(["system_admin","noc_lead","content_admin"]) */
  viewAuditLogs: [ALWAYS, 'noc_lead', 'content_admin'] as const,
} as const

export type Capability = keyof typeof CAPABILITIES

export function hasCapability(roleId: string | undefined | null, capability: Capability): boolean {
  if (!roleId) return false
  const allowed: readonly string[] = CAPABILITIES[capability]
  return allowed.includes(roleId)
}

/** `"*"` in permitted_categories means every category is readable/searchable. */
export function isCategoryPermitted(
  permittedCategories: readonly string[] | undefined,
  categoryId: string,
): boolean {
  if (!permittedCategories?.length) return false
  return permittedCategories.includes('*') || permittedCategories.includes(categoryId)
}

/** Presentable role label; falls back to the raw id for unknown roles. */
export function roleLabel(roleId: string, roleName?: string | null): string {
  if (roleName) return roleName
  switch (roleId) {
    case 'support_l1':
      return 'Support Engineer (L1)'
    case 'sme_senior':
      return 'Senior / SME Engineer'
    case 'content_admin':
      return 'Content Admin'
    case 'noc_lead':
      return 'NOC / Team Lead'
    case 'system_admin':
      return 'System Admin'
    default:
      return roleId
  }
}
