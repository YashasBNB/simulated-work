# AGENTS.md

Persistent project context for the **Incident Assistant** frontend.
Read this file first at the start of every session.

---

## 1. Project overview

Mission-critical AI telecom troubleshooting platform. An engineer submits a
natural-language question or telecom error code; the backend retrieves
authorized runbook chunks and returns a grounded answer with source citations
(document title, version, vendor, section reference) — or an explicit
"no confident answer".

- **Backend**: FastAPI + SQLAlchemy + hybrid BM25/dense retrieval with RBAC.
  Lives in `/backend`. **Read-only for this project.**
- **This project**: `/frontend` — React + TypeScript + Vite + React Router +
  Tailwind CSS v4. SPA only; no SSR, no mock data.
- **PRD**: `Telecom AI Troubleshooting.docx` (sibling of the repo root).

The backend is the source of truth for all API contracts. When the PRD and the
backend disagree, the **backend wins** and the discrepancy is documented rather
than worked around by changing backend code.

---

## 2. Frontend architecture

```
src/
  api/            Typed HTTP layer, one module per backend resource
    client.ts       fetch wrapper: base URL, bearer token, ApiError, 401 broadcast
    auth.ts  query.ts  documents.ts  feedback.ts  analytics.ts  audit.ts
  types/api.ts    Wire types mirroring backend/app/schemas/*.py
  auth/
    authContext.ts   Context + useAuth/useRoleId (no JSX so fast-refresh is clean)
    AuthProvider.tsx Session owner: token persistence, /auth/me bootstrap, 401
    rbac.ts          Capability→role map mirroring backend require_roles
    guards.tsx       RequireAuth / RequireCapability route gates
    demoAccounts.ts  Seeded backend identities shown on the login screen
  hooks/useAsyncResource.ts   useAsyncResource (loading/refreshing/error) + useMutation
  lib/
    format.ts        UTC date/latency/percent/bytes formatting
    confidence.ts    Confidence banding + palette
    answerParser.ts  Splits the backend's Markdown answer envelope into sections
  components/
    ui/              Button, Card, Badge, Table, Modal, Field, States (loading/empty/error)
    layout/AppShell  Sidebar + role-aware nav + user footer
    assistant/       AnswerPanel, CitationList, FeedbackBar, Markdown
  pages/            One file per route
```

Rules that hold throughout:

- **No component fetches directly.** Pages call `src/api/*` through the hooks.
- **No `any`.** Wire types live in `types/api.ts`; unknown payloads narrow.
- UI primitives live in `components/ui`; pages compose them, never duplicate them.
- Every list view has loading, empty, error and refresh states.

### Environment

`VITE_API_BASE_URL` — absolute backend origin for a deployed build.
Empty (the default, see `.env.example`) ⇒ same-origin requests through the Vite
dev proxy, which forwards `/api` to `VITE_DEV_PROXY_TARGET` (default
`http://localhost:8000`). Copy `.env.example` to `.env.local` to override.

---

## 3. API integration notes

All paths are under `/api/v1`. Bearer token in `Authorization`.

| Module | Endpoint | Notes |
|---|---|---|
| `auth.ts` | `POST /auth/login` | Body is `{ email }` only — **no password**. Returns 404 (not 401) for an unknown address; the login screen renders that as "no account for this address". Response embeds the full `user` object **with its resolved `role`**, so no extra `/auth/me` call is needed after login. |
| `auth.ts` | `GET /auth/me` | Used on reload to restore the session. |
| `auth.ts` | `GET /auth/roles`, `GET /auth/users` | Role catalogue and active users. |
| `query.ts` | `POST /query` | `{ query_text, category_filter }`. Empty/whitespace text → 400. Returns `AnswerResponse` including `is_confident`, `confidence`, `citations[]`, `latency_ms`. |
| `query.ts` | `GET /query/history?limit=N` | Signed-in user's own queries, newest first. `answer` may be `null`. |
| `documents.ts` | `GET /documents` | Optional `status`, `category_id`, `vendor` (case-insensitive `ILIKE`). Already RBAC-filtered server-side — never filter by category client-side for security. |
| `documents.ts` | `GET /documents/{doc_id}` | Adds `category` and parsed `chunks`. 403 when the category is outside the role's scope. |
| `documents.ts` | `GET /documents/categories` | Public on the backend; used to populate filter dropdowns. |
| `documents.ts` | `POST /documents/upload` | **multipart/form-data**: `file`, `title`, `category_id`, `vendor?`, `version` (defaults to `1.0.0`). Extensions limited to `.pdf .docx .doc .txt .md` → 400 otherwise. Unknown category → 400. Roles: `content_admin`, `system_admin`. |
| `documents.ts` | `POST /documents/{doc_id}/deprecate` | `{ reason, replacement_doc_id }`; both optional (reason defaults to "Deprecated by administrator"). Re-deprecating → 400. Irreversible — no backend un-deprecate endpoint. |
| `feedback.ts` | `POST /feedback` | `{ answer_id, rating, flagged, flag_reason?, flag_details? }`. `rating`: 1 helpful, -1 unhelpful, 0 flag-only. Unknown answer → 404. **Appends a new row per call — it does not upsert**, so one rating and one flag create two records. |
| `feedback.ts` | `GET /feedback/flagged?status_filter=` | `pending` default; `all` disables the filter. `answer_text` is truncated to 300 chars server-side. Read roles include `noc_lead`. |
| `feedback.ts` | `POST /feedback/{id}/review` | `{ flag_status, resolution_action?, reviewer_notes? }`. `flag_status`: reviewed/resolved/dismissed. `resolution_action`: doc_updated / doc_deprecated / false_positive / wont_fix. Resolve roles: `sme_senior`, `system_admin` only. |
| `analytics.ts` | `GET /analytics/overview` | Aggregate metrics only — there is no time-series endpoint, so no historical charts are drawn. |
| `audit.ts` | `GET /audit` | Optional `action`, `entity`, `user_id`, `limit` (**max 200**, `le=200`). Newest first. |

### Error handling

`ApiError` in `client.ts` carries `status`, `detail` and a `kind` derived from
the status code:

| kind | status | UI behaviour |
|---|---|---|
| `unauthorized` | 401 | Clears the token, broadcasts `auth:unauthorized`, `AuthProvider` drops to anonymous and the router redirects to `/login`. |
| `forbidden` | 403 | Inline error; the action is also hidden by RBAC in most cases. |
| `not_found` | 404 | Inline error with the backend's detail. |
| `validation` | 400, 422 | Flattened FastAPI 422 detail (`loc: msg`) into one line. |
| `server` | 5xx | Retryable inline error. |
| `network` | — | "Unable to reach the backend service." |

---

## 4. Authentication & RBAC

Email-only login returning a bearer JWT. Token is held in
`localStorage` under `nta.token`. No password field exists in the contract.

`src/auth/rbac.ts` mirrors the backend's `require_roles` declarations
**capability by capability**. Roles are never hardcoded into components — they
are read from the authenticated profile. `require_roles` also implicitly allows
`system_admin`, which the mirror reproduces.

| Capability | Endpoint | Roles |
|---|---|---|
| `runQuery`, `viewOwnHistory`, `viewDocuments`, `viewDocumentDetail`, `submitFeedback` | query, history, documents, feedback POST | all authenticated |
| `uploadDocuments`, `deprecateDocuments` | upload, deprecate | `content_admin`, `system_admin` |
| `viewReviewQueue` | GET flagged | `sme_senior`, `content_admin`, `system_admin`, `noc_lead` |
| `resolveFlags` | POST review | `sme_senior`, `system_admin` |
| `viewAnalytics` | analytics overview | `noc_lead`, `system_admin`, `content_admin`, `sme_senior` |
| `viewAuditLogs` | audit | `system_admin`, `noc_lead`, `content_admin` |

Category scope comes from `user.role.permitted_categories`; `"*"` means all.
The frontend uses it to offer only searchable categories and to display the
scope, but the enforcement happens in the backend's retrieval and document
layers. **Frontend RBAC is a UX affordance only.**

`noc_lead` is the important asymmetry: it may read the review queue but not
resolve flags. The UI hides the resolve action entirely for that role.

---

## 5. Implementation status

| Area | Status |
|---|---|
| Typed API layer, error normalisation, 401 handling | Done |
| Email login, session restore, logout, route guards | Done |
| Role-aware sidebar nav + capability route gates | Done |
| Incident Assistant (query, confidence, steps, citations, feedback, flag, no-answer state) | Done |
| Query History + stored-answer viewer | Done |
| Documents list, filters, upload, deprecate | Done |
| Document detail with indexed sections | Done |
| SME Review Queue (read + resolve) | Done |
| Analytics dashboard | Done |
| Audit Logs with filters | Done |
| Shared UI kit, responsive layout, accessibility pass | Done |
| Production build + `tsc` + lint clean | Done |
| End-to-end browser verification across all five roles | Done (76 checks) |
| Automated test suite committed to the repo | **Not done** — verification was performed with a throwaway Playwright script outside `/frontend`. Add Vitest/RTL or Playwright under `frontend/` if CI coverage is required. |

### PRD vs backend discrepancies (documented, backend not modified)

1. **PRD scope says "RBAC (3 roles)"; the backend seeds 5** (`support_l1`,
   `sme_senior`, `content_admin`, `noc_lead`, `system_admin`). The frontend
   supports all five and reads role metadata from the API.
2. **PRD says SSO/OAuth2; the backend implements passwordless email login**
   (`{ email }` only, 404 on unknown user). The UI matches the backend.
3. **PRD lists OCR for scanned manuals; the backend has no OCR.** Frontend
   accepts only the formats the backend can actually parse.
4. **`backend/app/config.py` imports `pydantic_settings` and
   `app/schemas/auth.py` uses `EmailStr`, but `requirements.txt` omits
   `pydantic-settings` and `email-validator`.** A clean
   `pip install -r requirements.txt` leaves the backend unable to start
   (`ModuleNotFoundError`). **Install those two explicitly** — see §7. The login
   screen detects an unreachable backend and prints this fix rather than a bare
   error. Documented rather than patched, since `/backend` is read-only.
5. **`noc_lead` can read the review queue but cannot resolve flags** — an
   intentional-looking backend asymmetry, surfaced in the UI.
6. **No analytics time-series endpoint exists**, so the dashboard shows
   aggregates only; no historical trend charts are fabricated.

---

## 6. Known issues / notes

- Feedback is append-only server-side; a helpful click followed by a flag
  creates two rows. The UI treats them as separate intents and says so.
- `GET /documents` returns 200 with an empty list for a category the role
  cannot read; it does not 403. An empty table is therefore not always an error.
- The backend's answer envelope is Markdown; `answerParser.ts` depends on the
  exact heading strings from `llm_service.synthesize_grounded_answer`. If that
  changes, the parser falls back to rendering the raw text as Markdown.
- Answer text arrives as naive UTC timestamps with no offset; `format.ts`
  normalises by appending `Z`.
- Query history is stored server-side per user and is not deletable from the UI.
- No pagination on `/documents` or `/feedback/flagged` — both return full lists.

---

## 7. How to run / verify

Prerequisites: Node 20+ and a running backend on port 8000.

```bash
# Backend (separate shell, from /backend)
pip install -r requirements.txt
# REQUIRED: these two are missing from requirements.txt but imported by
# app/config.py (pydantic_settings) and app/schemas/auth.py (EmailStr).
pip install pydantic-settings email-validator
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000

# Verify before opening the UI
curl localhost:8000/health        # must print {"status":"healthy", ...}

# Frontend (from /frontend)
npm install
cp .env.example .env.local        # optional; defaults work for local dev
npm run dev                       # http://localhost:5173
```

If sign-in reports **"Backend unreachable"**, the frontend is fine and port 8000
has nothing listening. Check the backend terminal for a `ModuleNotFoundError`
and confirm with `curl localhost:8000/health`.

**Persistent local setup on this machine** (avoids reinstalling on reboot;
nothing inside the repo):
- Backend venv: `~/.venvs/sim-work-backend` (requirements plus the two missing
  packages already installed). Restart with:
  ```bash
  cd backend && PYTHONPATH=. \
    DATABASE_URL="sqlite:///$HOME/.local/share/sim-work/outage.db" \
    UPLOAD_DIR="$HOME/.local/share/sim-work/uploads" \
    ~/.venvs/sim-work-backend/bin/python -m uvicorn app.main:app --port 8000
  ```
- Backend data and logs live in `~/.local/share/sim-work/` (`outage.db`,
  `uploads/`, `backend.log`), so the repo never gains stray `.db` files and a
  `/tmp` cleanup cannot break a running instance. The `DATABASE_URL`/`UPLOAD_DIR`
  overrides are read by `backend/app/config.py` from the environment; the repo
  defaults are unchanged.
- Frontend: `cd frontend && npm run dev` (port 5173).

Checks:

```bash
npm run lint                         # oxlint, 0 warnings expected
npx tsc -b                           # must be silent
npm run build                        # production build
npm run preview                      # serve the built output
```

Manual smoke path: sign in as `alex.chen@company.internal`, query
`CrashLoopBackOff` (expect cited answer), query
`zzz alien quantum flux capacitor` (expect the no-confident-answer state), then
sign in as `sarah.sme@company.internal` to resolve the flag from the assistant,
`marcus.admin@company.internal` to upload and deprecate, and
`admin@company.internal` to see the full navigation set.

Seeded identities are listed on the login screen and in `auth/demoAccounts.ts`.
