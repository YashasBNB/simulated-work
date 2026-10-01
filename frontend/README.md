# Incident Assistant — Frontend

Web UI for the AI-powered telecom troubleshooting platform. An engineer submits
a natural-language question or telecom error code; the backend retrieves
authorized runbook chunks and returns a grounded answer with source citations —
or an explicit **"no confident answer"**.

React 19 · TypeScript · Vite · React Router · Tailwind CSS v4.
Integrates with the FastAPI backend in `../backend`. No mock data.

---

## Quick start

The backend must be running on port 8000:

```bash
cd ../backend
pip install -r requirements.txt
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Then, from this directory:

```bash
npm install
npm run dev            # http://localhost:5173
```

Sign in with any seeded identity (no password — the API is email-only). The
login screen lists them; they come from the backend seed:

| Role | Email | Sees |
|---|---|---|
| Support Engineer (L1) | `alex.chen@company.internal` | Assistant, History, Documents |
| Senior / SME Engineer | `sarah.sme@company.internal` | + Review Queue, Analytics |
| Content Admin | `marcus.admin@company.internal` | + upload / deprecate, Audit Logs |
| NOC / Team Lead | `elena.noc@company.internal` | Analytics, Audit Logs, read-only queue |
| System Admin | `admin@company.internal` | Everything |

## Configuration

Copy `.env.example` to `.env.local` to override defaults:

| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Backend origin for a deployed build | empty ⇒ same-origin via the Vite dev proxy |
| `VITE_DEV_PROXY_TARGET` | Origin the dev server proxies `/api` to | `http://localhost:8000` |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server on port 5173 with HMR |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | oxlint (0 warnings expected) |
| `npx tsc -b` | Type-check only |

## Features

- **Incident Assistant** — NL / error-code search, confidence score, structured
  troubleshooting steps, verification commands, and source citations that name
  the document, version, vendor and section for every confident answer. Helpful
  / not-helpful rating and answer flagging.
- **Query History** — your own queries with outcome, confidence, citation count
  and latency; stored answers can be reopened.
- **Documents** — RBAC-filtered runbook library with vendor, category, version
  and status; multipart upload; deprecation with reason and replacement document;
  per-document indexed sections.
- **SME Review Queue** — flagged answers with status filters, answer excerpts and
  a resolution dialog (status, action, reviewer notes).
- **Analytics** — total queries, average and P95 latency against the 5 s SLA,
  confident-answer rate, estimated MTTR saved, documentation health, feedback
  totals, top error codes and documentation gaps.
- **Audit Logs** — compliance trail with action, entity, user and row-count
  filters and expandable detail payloads.

## Project documentation

- `AGENTS.md` — persistent project context: architecture, API notes, RBAC rules,
  implementation status, PRD/backend discrepancies, how to run and verify.
  **Read this first.**
- `DECISIONS.md` — architectural decision log (`DEC-001` …).
- `CHANGELOG.md` — dated implementation history.

## Layout

```
src/
  api/        Typed HTTP layer, one module per backend resource
  types/      Wire types mirroring the backend Pydantic schemas
  auth/       Session context, RBAC capability map, route guards
  hooks/      Data-fetching and mutation hooks
  lib/        Formatting, confidence banding, answer parsing
  components/ ui/ shared primitives · layout/ shell · assistant/ answer surface
  pages/      One file per route
```

## Notes

- Frontend RBAC is a UX affordance. The backend enforces authorization on every
  request and remains the security boundary.
- `GET /documents` returns `200` with an empty list for a category outside the
  caller's scope, so an empty table is not necessarily an error.
- See `AGENTS.md` for known backend discrepancies (missing `pydantic-settings`
  and `email-validator` in `backend/requirements.txt`, and others).
