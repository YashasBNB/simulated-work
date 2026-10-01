# DECISIONS

Architectural decision log for the Incident Assistant frontend.
Only meaningful decisions are recorded; trivial changes are not.

Format: `DEC-NNN` — decision — rationale — consequences.

---

## DEC-001 — Feature-first SPA with a thin typed API layer

Stack: React 19 + TypeScript + Vite + React Router + Tailwind CSS v4. Every
backend resource gets one module under `src/api/` exporting typed functions;
`src/api/client.ts` owns `fetch`, the base URL, the bearer token, and error
normalisation.

**Rationale:** the backend contract is the only thing that must stay stable.
Isolating it in `api/` means a contract change touches one file per resource
instead of every component. It also keeps components free of fetch logic, so
they stay testable and readable.

**Consequences:** pages call `src/api/*` through `hooks/useAsyncResource.ts` and
never fetch directly. Wire types live in `types/api.ts` and mirror
`backend/app/schemas/*.py` field for field.

---

## DEC-002 — Capability-based frontend RBAC mirroring the backend

Roles are not hardcoded into components. `src/auth/rbac.ts` maps a
**capability** (`uploadDocuments`, `resolveFlags`, `viewAuditLogs`, …) to the
role ids allowed by the corresponding `require_roles([...])` declaration, and
nav items / route gates declare a capability instead of a role.

**Rationale:** components describe *what the user is doing*, not *who they are*.
A capability map also makes the `require_roles` implicit-`system_admin` rule
explicit in one place, so it cannot be forgotten on one route.

**Consequences:** `RequireCapability` renders an explanatory access-denied panel
rather than a blank page. The backend re-checks every request, so this is
purely a UX affordance — never a security control.

---

## DEC-003 — 401 handled centrally via a browser event

`client.ts` listens for its own 401s and dispatches `auth:unauthorized`.
`AuthProvider` owns that listener and clears the token plus user state, which
moves the router to `/login`.

**Rationale:** without a single owner, every page would need to handle an
expired session, and a dead token would leave the UI half-authenticated — nav
still rendered, every request 401ing. Centralising it means session expiry is
handled uniformly for all 13 endpoints.

**Consequences:** the login call itself passes `silentUnauthorized` so its own
404/401 handling is not intercepted. A network failure during `/auth/me`
deliberately keeps the token and surfaces an error instead of signing out.

---

## DEC-004 — No client-side data library

Plain React context for the session; local component state plus URL search
params for everything else. Data fetching is `useAsyncResource` (a small hook
returning `data` / `error` / `loading` / `refreshing` / `reload`) and
`useMutation` for POST actions.

**Rationale:** the app is a handful of read-mostly screens against a REST API.
A query cache would add a dependency and a normalisation layer with nothing to
cache — the backend already scopes query history per user and analytics is a
single aggregate.

**Consequences:** `loading` is separated from `refreshing` so refreshes do not
flash a skeleton over existing rows. In-flight requests are aborted on unmount.

---

## DEC-005 — Incident Assistant query state lives in the URL

The assistant keeps `?q=…&category=…` in the URL via `useSearchParams`, and the
answer itself in component state.

**Rationale:** during an incident an engineer needs to paste a link to a
colleague or put the query in a ticket. URL state makes results shareable and
survives a reload. The rendered answer is refetched from `/query/history` on
mount, since the backend has no "get answer by id" endpoint.

**Consequences:** `?q=` deep links restore the last matching answer from
history; if the query is not in history the page simply shows the empty state
and the engineer re-runs it. This is the closest available approximation of
shareable results.

---

## DEC-006 — The "no confident answer" state is a first-class screen

When `is_confident` is false the answer panel renders a dedicated state:
the backend's refusal text, the confidence against the 0.35 threshold, an
explicit "0 citations", and documentation-gap guidance. It never renders an
answer body, and it still allows rating and flagging.

**Rationale:** the PRD's hard requirement is that an answer either cites its
source or says it has none. Rendering an empty or partial answer would blur
that guarantee. The confidence is shown as a fraction of the threshold so the
engineer can see *how far* it fell short.

**Consequences:** `CitationList` has a defensive branch for zero citations on a
confident answer, since the backend contract does not strictly forbid that
combination.

---

## DEC-007 — The backend's Markdown answer is restructured, never re-authored

`lib/answerParser.ts` splits the backend's known Markdown envelope
(`### Resolution for`, `**Troubleshooting Summary:**`,
`**Exact Troubleshooting Steps…**`, ```` ```bash ````, `> **Verified Source
Citation**`, `**Additional Corroborating References:**`) into sections that
render as a scannable answer body: assessment, numbered steps, command block,
references.

Every value is a verbatim slice of the response — nothing is summarised,
rewritten or invented. The `**Primary Source**` / `**Section Reference**`
header lines are dropped because the citation panel renders those fields from
the structured `citations[]` array, which is authoritative.

**Rationale:** raw Markdown from the backend is technically correct but reads
poorly during an incident, when speed of scanning matters. Reorganising is a
presentation concern; rewriting content would compromise the grounding
guarantee and blur the line between the backend's output and the UI's.

**Consequences:** if the envelope changes (e.g. an external LLM returns a
free-form answer) the parser reports `structured: false` and the raw text
renders as Markdown. No UI depends on the parser succeeding.

---

## DEC-008 — Route-level code splitting; assistant stays eager

The Incident Assistant and Login are statically imported; Analytics, Audit,
Documents, History, Review Queue and document detail are `React.lazy`.

**Rationale:** the assistant is the hot path during an outage and must be
usable immediately. The governance and library screens are visited
intermittently and pull in table, form and Markdown machinery.

**Consequences:** main chunk is ~460 kB (141 kB gzip), with the remaining
routes as small on-demand chunks. Sidebar links show a brief loading state on
first navigation to a route.

---

## DEC-009 — Enterprise NOC visual language: dense, flat, no decoration

Custom neutral ramp (`noc-*`) plus a fixed operational status palette
(`ops-critical / warning / healthy / info / neutral`) defined as Tailwind v4
theme tokens. Borders and background tints instead of shadows; tabular numerals
for metrics; a dark fixed sidebar with a light content area.

**Rationale:** the audience scans this under time pressure during outages. High
information density, obvious status indicators and predictable alignment matter
far more than visual flourish. A fixed status palette means "deprecated" is
always the same red everywhere.

**Consequences:** no gradients, no marketing layouts, no decorative animation;
`prefers-reduced-motion` is honoured globally. Semantic HTML (real tables,
`<details>` disclosures, `<dialog>`-style modals) is preferred over ARIA
patching.

---

## DEC-010 — Table rows are not `role="button"`

Clickable `<tr>` rows carry an `onClick` for mouse convenience but no
`role="button"`, no `tabIndex` and no key handler.

**Rationale:** these rows contain their own action buttons. Announcing the row
as a button creates nested interactives that confuse screen readers and break
Tab order — it was caught by automated testing, where a document titled
"…(Deprecated)" made the whole row register as a "Deprecate" button.

**Consequences:** every row action has a real focusable button, so keyboard
users are not disadvantaged. Row click is an additional shortcut only.

---

## DEC-011 — Feedback and flagging are separate submissions

"Helpful / Not helpful" sends `rating ±1, flagged false`. The flag dialog sends
`rating 0, flagged true, flag_reason, flag_details`. Each becomes its own
`POST /feedback` row.

**Rationale:** that is the backend's actual behaviour — the endpoint appends and
does not upsert, and the flag dialog's reason/detail fields have no meaning for
a plain rating. Treating them as one composite mutation would misrepresent the
contract.

**Consequences:** rating and then flagging an answer creates two feedback rows.
The UI keeps the two interactions visually independent and does not attempt to
merge or overwrite state client-side.

---

## DEC-012 — Read-only roles get no dead buttons

Capabilities gate rendering, not just the request. A `noc_lead` sees the review
queue with no "Review" button and an explanatory notice; an `l1` engineer sees
no Upload or Deprecate actions on Documents and a read-only banner.

**Rationale:** a visible control that always returns 403 trains engineers to
ignore errors during an incident. Hiding it is honest, and the page header still
states what the role can and cannot do.

**Consequences:** `ReviewQueuePage` branches on `resolveFlags` for the action and
the notice; `DocumentsPage` branches on `uploadDocuments` / `deprecateDocuments`.
`noc_lead`'s read access to the queue is a genuine backend asymmetry, so its
presence in the sidebar and the absence of its action button are both deliberate.

---

## DEC-013 — Backend wins, discrepancies are documented

Where the PRD and the implemented backend differ, the frontend implements the
backend and records the difference in `AGENTS.md`. `/backend` is never modified.

Specific cases: the PRD's "RBAC (3 roles)" versus 5 seeded roles; PRD SSO versus
passwordless email login; PRD OCR versus no OCR support; the missing
`pydantic-settings` and `email-validator` entries in `backend/requirements.txt`.

**Rationale:** the task treats the backend as the source of truth and
read-only. Silently "fixing" either side would produce a frontend that cannot be
demonstrated against the real service, and patching backend dependencies would
violate the working boundary.

**Consequences:** a clean `pip install -r backend/requirements.txt` still fails at
startup until those two packages are added upstream. Frontend sign-in is
email-only because that is the only credential the API accepts.

---

## DEC-014 — Empty list ≠ error on filtered endpoints

`GET /documents?category_id=…` returns **200 with an empty array** when the
category is outside the caller's permitted categories; only `GET /documents/{id}`
returns 403.

**Rationale:** the list endpoint filters silently at the query level while the
detail endpoint enforces explicitly. Treating an empty result as an error would
show a misleading failure state for a legitimate access restriction.

**Consequences:** the Documents empty state explains that filters may be
excluding everything, and role scope is surfaced in the sidebar
("4 categories" / "All categories"). No client-side category filter is applied
for security — the backend already returns only permitted documents.

---

## DEC-015 — Backend responses rendered as Markdown with HTML disabled

`react-markdown` + `remark-gfm` render answer text. Raw HTML is **not**
enabled and there is no `rehype-raw`.

**Rationale:** answer text is derived from ingested third-party vendor documents.
Disabling raw HTML means a runbook containing `<script>` or an `onerror`
attribute renders as inert text instead of executing.

**Consequences:** answers get proper tables, fenced code blocks and blockquotes
without a custom renderer. Content that relies on embedded HTML will display as
literal markup, which is the safe failure mode.
