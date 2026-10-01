/**
 * Display metadata for the sign-in screen.
 *
 * The emails come from `backend/app/seed.py` — they are the backend's documented
 * demo accounts, surfaced as a convenience only. The login form itself accepts
 * any email and lets the backend decide; no credential is ever hardcoded.
 */
export const DEMO_ACCOUNTS: { email: string; roleId: string; label: string }[] = [
  { email: 'alex.chen@company.internal', roleId: 'support_l1', label: 'Support Engineer (L1)' },
  { email: 'sarah.sme@company.internal', roleId: 'sme_senior', label: 'Senior / SME Engineer' },
  { email: 'marcus.admin@company.internal', roleId: 'content_admin', label: 'Content Admin' },
  { email: 'elena.noc@company.internal', roleId: 'noc_lead', label: 'NOC / Team Lead' },
  { email: 'admin@company.internal', roleId: 'system_admin', label: 'System Admin' },
]
