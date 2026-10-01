# CHANGELOG

Meaningful implementation changes to the Incident Assistant frontend.
Dated sections; Added / Changed / Fixed.

---

## 2026-10-01 — Initial frontend implementation

Complete React + TypeScript + Vite + React Router + Tailwind v4 SPA integrated
against the existing FastAPI backend. No mock data anywhere.

### Added

**Project foundation**
- Vite + React 19 + TypeScript scaffold, strict TypeScript, Tailwind CSS v4 via
  `@tailwindcss/vite`, oxlint configuration.
- `.env.example` with `VITE_API_BASE_URL` and `VITE_DEV_PROXY_TARGET`; Vite dev
  proxy forwards `/api` to the backend for same-origin development.
- `AGENTS.md`, `DECISIONS.md`, `CHANGELOG.md`.

**API layer**
- `src/api/client.ts`: typed `ApiError` with status/kind classification, bearer
  token attachment, FastAPI 422 detail flattening, central 401 broadcast.
- Typed modules for every documented endpoint: `auth`, `query`, `documents`,
  `feedback`, `analytics`, `audit`.
- `src/types/api.ts` mirroring `backend/app/schemas/*.py`.

**Authentication and RBAC**
- Email-only login, JWT persisted in `localStorage`, `/auth/me` session restore,
  logout, and a single-owner 401 handler.
- `auth/rbac.ts` capability map mirroring the backend's `require_roles`
  declarations; `RequireAuth` and `RequireCapability` route guards.
- Role-aware sidebar navigation; role and category scope shown in the footer.
- Login screen listing the five seeded backend identities.

**Incident Assistant**
- Natural-language and error-code search with optional category filter.
- Answer panel: confidence meter, detected error codes, quick assessment,
  numbered troubleshooting steps, verification command block, corroborating
  references, verified source citation.
- Source citations with document title, version, vendor, category, section
  reference, cited excerpt and a link to the source document.
- Dedicated "no confident answer" state showing the threshold shortfall and
  documentation-gap guidance, with feedback still available.
- Helpful / not-helpful rating and an answer-flagging dialog with reason and
  details.
- Query state persisted in the URL for shareable incident links.

**Other pages**
- Query History with filters and a stored-answer viewer.
- Documents: list with status/category/vendor filters, multipart runbook upload,
  deprecation with reason and replacement document, indexed section detail view.
- SME Review Queue: status filters, flagged answer excerpts, resolution dialog.
- Analytics: performance, documentation health, feedback, top error codes and
  documentation gaps — all from the backend aggregate endpoint.
- Audit Logs with action, entity, user and limit filters, expandable detail rows.

**UI kit**
- Reusable `Button`, `Card`, `Badge`, `Table`, `Modal`, `Field` and `States`
  (loading / empty / error / inline notice) components.
- Responsive layout, mobile navigation drawer, accessible modals, real table
  semantics, `prefers-reduced-motion` support.
- `lib/answerParser.ts` restructuring the backend's Markdown answer envelope,
  `lib/format.ts` UTC and metric formatting, `lib/confidence.ts` banding.

### Changed

- Answer content is reorganised for scanning rather than rendered as raw
  Markdown; source attribution comes from the structured `citations` array
  (see DEC-007).
- Clickable table rows dropped `role="button"` to avoid nested interactives;
  row actions are real focusable buttons (DEC-010).
- Non-assistant routes code-split with `React.lazy`; main chunk reduced from
  ~517 kB to ~461 kB (141 kB gzip).
- Permissions gate rendering rather than only the request, so read-only roles
  see no actions that would 403 (DEC-012).

### Fixed

- A 502 from the Vite dev proxy surfaced as "Request failed with status 502" with
  no explanation, and was misclassified as a backend application error. Proxy
  502/503/504 responses now map to the `network` kind with actionable copy, and
  the login screen renders a dedicated "Backend unreachable" panel containing the
  start commands and the missing-dependency note.
- Answer parser initially merged the verified-citation quote and Markdown
  headings into the command block, and left the summary and step list empty.
  Section boundaries are now computed from the next heading or the citation
  quote.
- Document filenames in the Documents table overflowed their column; now
  truncated with the full name in a `title` tooltip.
- Documentation health panel had unbalanced whitespace against the adjacent
  feedback panel; replaced with a searchable-share bar and a chunk count aligned
  to the panel bottom.
- The app shell forced a horizontal scrollbar on viewports below `lg`: the
  fixed 256px sidebar was still a flex item in a row layout, squeezing the
  content column to zero width. The shell now stacks on small screens and the
  answer meta header no longer collapses the query text on narrow viewports.

### Verification

- `npx tsc -b` clean, `npm run lint` 0 warnings, `npm run build` succeeds.
- Browser end-to-end pass covering all five roles: login (including unknown-email
  404), confident answer with citations, helpful rating, flag submission,
  no-confident-answer state, query history, document list/detail, upload,
  deprecate, review queue resolution, analytics, audit filtering, role-based
  navigation and route denial, mobile layout, and expired-token redirect.
  76/76 checks passed against the live backend.
