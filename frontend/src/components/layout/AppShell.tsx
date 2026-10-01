import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../auth/authContext'
import { hasCapability, roleLabel } from '../../auth/rbac'
import type { Capability } from '../../auth/rbac'
import {
  ChartIcon,
  ClockIcon,
  CloseIcon,
  DocumentIcon,
  FlagIcon,
  SearchIcon,
  ShieldIcon,
  TerminalIcon,
} from '../ui/Button'
import { Badge } from '../ui/Badge'

interface NavItem {
  to: string
  label: string
  icon: typeof TerminalIcon
  capability: Capability
  description: string
}

interface NavSection {
  heading: string
  items: NavItem[]
}

/**
 * Sidebar entries are filtered by capability, mirroring the backend's
 * `require_roles` declarations. The backend still enforces every rule.
 */
const SECTIONS: NavSection[] = [
  {
    heading: 'Operations',
    items: [
      {
        to: '/assistant',
        label: 'Incident Assistant',
        icon: TerminalIcon,
        capability: 'runQuery',
        description: 'Search runbooks with natural language or error codes',
      },
      {
        to: '/history',
        label: 'Query History',
        icon: ClockIcon,
        capability: 'viewOwnHistory',
        description: 'Your recent queries and grounded answers',
      },
      {
        to: '/documents',
        label: 'Documents',
        icon: DocumentIcon,
        capability: 'viewDocuments',
        description: 'Runbook library, upload and deprecation',
      },
    ],
  },
  {
    heading: 'Governance',
    items: [
      {
        to: '/review',
        label: 'SME Review Queue',
        icon: FlagIcon,
        capability: 'viewReviewQueue',
        description: 'Flagged answers awaiting SME resolution',
      },
      {
        to: '/analytics',
        label: 'Analytics',
        icon: ChartIcon,
        capability: 'viewAnalytics',
        description: 'MTTR, latency and documentation gaps',
      },
      {
        to: '/audit',
        label: 'Audit Logs',
        icon: ShieldIcon,
        capability: 'viewAuditLogs',
        description: 'Compliance trail of every logged action',
      },
    ],
  },
]

export function AppShell() {
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const roleId = user?.role_id ?? ''
  const roleName = roleLabel(roleId, user?.role?.role_name)
  const permitted = user?.role?.permitted_categories ?? []
  const scopeLabel =
    permitted.includes('*') ? 'All categories' : `${permitted.length} categories`

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Mobile top bar */}
      <header className="bg-noc-900 text-noc-50 flex h-14 w-full shrink-0 items-center justify-between border-b border-noc-800 px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <TerminalIcon className="text-ops-info size-5" />
          <span className="text-sm font-semibold tracking-tight">Incident Assistant</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls="app-sidebar"
          className="rounded border border-noc-700 p-1.5 text-noc-100"
        >
          <span className="sr-only">Toggle navigation</span>
          {mobileOpen ? <CloseIcon /> : <SearchIcon />}
        </button>
      </header>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-20 bg-noc-950/50 lg:hidden"
        />
      ) : null}

      <aside
        id="app-sidebar"
        className={`bg-noc-900 fixed inset-y-0 left-0 z-30 flex w-64 shrink-0 flex-col border-r border-noc-800 transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-noc-800 px-4">
          <TerminalIcon className="text-ops-info size-5" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-noc-50">
              Incident Assistant
            </p>
            <p className="truncate text-[10px] tracking-wide text-noc-400 uppercase">
              Telecom troubleshooting
            </p>
          </div>
        </div>

        <nav className="scrollbar-slim flex-1 overflow-y-auto px-2 py-3" aria-label="Main navigation">
          {SECTIONS.map((section) => {
            const items = section.items.filter((item) => hasCapability(roleId, item.capability))
            if (items.length === 0) return null
            return (
              <div key={section.heading} className="mb-4 last:mb-0">
                <p className="px-2 pb-1.5 text-[10px] font-semibold tracking-wider text-noc-500 uppercase">
                  {section.heading}
                </p>
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon
                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          onClick={() => setMobileOpen(false)}
                          title={item.description}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors ${
                              isActive
                                ? 'bg-ops-info/15 text-white ring-1 ring-ops-info/40 ring-inset'
                                : 'text-noc-300 hover:bg-noc-800 hover:text-noc-50'
                            }`
                          }
                        >
                          <Icon className="size-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </NavLink>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        <div className="border-t border-noc-800 px-3 py-3">
          <div className="mb-2 min-w-0">
            <p className="truncate text-xs font-medium text-noc-100">{user?.name}</p>
            <p className="truncate text-[11px] text-noc-400">{user?.email}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge tone="info" title={`Role: ${roleId}`}>
                {roleName}
              </Badge>
              <Badge tone="muted" className="border-noc-700 bg-noc-800 text-noc-300">
                {scopeLabel}
              </Badge>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="text-noc-300 hover:bg-noc-800 hover:text-noc-50 w-full rounded-md border border-noc-700 px-2.5 py-1.5 text-xs font-medium transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-w-0 flex-1">
          <Outlet key={location.pathname} />
        </main>
        <footer className="border-t border-noc-200 bg-white px-5 py-2.5">
          <p className="text-[11px] text-noc-500">
            Grounded answers only — every confident answer cites its source document, version and
            section.
          </p>
        </footer>
      </div>
    </div>
  )
}
