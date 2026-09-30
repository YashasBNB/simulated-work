# AI Outage & Runbook Assistant Backend

A mission-critical AI-powered outage and runbook assistant designed for Support Engineers (L1), Senior/SME Engineers, Content Admins, and NOC Team Leads. Delivers exact, source-cited troubleshooting steps during live outages with P95 latency ≤ 5s, strict RBAC, hybrid vector + keyword retrieval, document lifecycle versioning/deprecation, and complete audit logging.

---

## 🌟 Key Features

1. **Grounded Incident Assistant & SLA Guarantee**:
   - **Error-Code & Natural Language Search**: Handles complex infrastructure queries (e.g. `HTTP 504`, `CrashLoopBackOff`, `ORA-01017`, `ERR_CONNECTION_REFUSED`).
   - **Top-3 Ranking for Error Codes**: Direct error-code detection guarantees incident-matching runbooks are prioritized.
   - **Strict Grounding & 100% Citation Guarantee**: 100% of answers cite `Document Title`, `Version`, `Vendor`, and `Section Reference` — or return *"No confident answer found in authorized runbooks and configuration guides for this query"*, eliminating LLM hallucinations.
   - **Sub-5-second SLA**: P95 retrieval and answer synthesis completes within SLA.

2. **Role-Based Access Control (RBAC)**:
   - Configurable category-level permissions per role:
     - `support_l1`: Support Engineer (L1) — authorized runbook categories during outages.
     - `sme_senior`: Senior/SME Engineer — full category access and flagged answer review queue.
     - `content_admin`: Content Admin — document upload, versioning, and deprecation.
     - `noc_lead`: NOC / Team Lead — operational analytics, MTTR tracking, and documentation gaps.
     - `system_admin`: Platform administration, RBAC, users, and audit logs.
   - Category filtering is enforced directly at the database/retrieval layer.

3. **Multi-Format Ingestion & Versioning**:
   - Ingests **PDF** (`PyMuPDF`), **DOCX** (`python-docx`), **Markdown**, and **Plain Text**.
   - Automatic section detection, technical keyword extraction, error code extraction, and dense semantic vector embeddings.
   - **Deprecation Workflow**: Deprecated documents are immediately excluded from active search results to prevent stale procedures from causing outage downtime.

4. **Feedback, Answer Flagging & SME Review Loop**:
   - Engineers can rate answers (helpful `+1` / unhelpful `-1`).
   - Flags answers with specific risk categories (e.g. `outdated runbook`, `incorrect command`, `hallucinated step`).
   - SME / Senior Engineer review queue allows reviewing, adding remediation notes, and resolving flags.

5. **NOC & Admin Observability Dashboard**:
   - Estimated MTTR reduction and minutes saved.
   - Query latency metrics (Average and P95).
   - Real-time Documentation Gap detection (aggregates unconfident / unanswered incident queries).
   - Top queried error codes and resolution rates.
   - Complete audit trail of all queries, uploads, deprecations, and admin actions.

---

## 🏗️ Architecture

```
[ Documents (PDF/DOCX/MD/TXT) ]
              │
              ▼
   [ Ingestion & Parsing Engine ] ──► [ Chunking & Section Detector ]
              │                                      │
              ▼                                      ▼
[ Dense Vector Embedding + Keyword Extraction + Error Code Extractor ]
                                      │
                                      ▼
                     [ Storage: Metadata DB (SQLite/PG) ]
                                      │
Engineer Query ──► [ Hybrid Retrieval Engine ] (BM25 + Dense Cosine + Error Code Boost)
                          │  (Enforces RBAC + Deprecation Exclusions)
                          ▼
                 [ Top Ranked Chunks ]
                          │
                          ▼
       [ Grounded Extractive / LLM Reasoning Engine ]
                          │  (SLA Confidence Check ≥ 0.35)
                          ├── Confident ──► Answer + Cited Sources (Doc, Section, Version)
                          └── Low Conf. ──► 'No confident answer found' + Log Doc Gap
                                      │
                                      ▼
             [ Audit Logging & MTTR Metrics Aggregation ]
```

---

## 🚀 Quick Start

### 1. Requirements
- Python 3.12+
- Virtualenv or system Python

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run Server
```bash
# Using the startup script
./run.sh

# Or directly with uvicorn
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The server automatically initializes database tables and seeds realistic incident runbooks (Kubernetes CrashLoopBackOff, Nginx 504 Gateway Timeout, PostgreSQL WAL lag, Cisco switch failover).

- **Interactive API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Specification**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 🧪 Running Automated Tests

Run the full test suite (15 unit and integration tests including complete incident lifecycle):

```bash
PYTHONPATH=. pytest tests -v
```

---

## 📚 API Endpoints Overview

| Method | Endpoint | Description | Permitted Roles |
|---|---|---|---|
| `GET` | `/health` | Health & SLA check | Public |
| `POST` | `/api/v1/auth/login` | Email login & JWT token | Public |
| `GET` | `/api/v1/auth/roles` | List RBAC roles & permitted categories | Authenticated |
| `GET` | `/api/v1/auth/me` | Current authenticated user profile | Authenticated |
| `POST` | `/api/v1/query` | Search runbooks (NL & error-code) | Authenticated |
| `GET` | `/api/v1/query/history` | Query history for current user | Authenticated |
| `GET` | `/api/v1/documents` | List documents (status/category filter) | Authenticated |
| `POST` | `/api/v1/documents/upload` | Upload & index PDF/DOCX/MD/TXT | `content_admin`, `system_admin` |
| `POST` | `/api/v1/documents/{id}/deprecate` | Deprecate runbook from search | `content_admin`, `system_admin` |
| `POST` | `/api/v1/feedback` | Rate answer / flag for SME review | Authenticated |
| `GET` | `/api/v1/feedback/flagged` | List flagged answers queue | `sme_senior`, `content_admin`, `system_admin` |
| `POST` | `/api/v1/feedback/{id}/review`| SME resolution & review notes | `sme_senior`, `system_admin` |
| `GET` | `/api/v1/audit` | Audit log compliance trail | `system_admin`, `noc_lead`, `content_admin` |
| `GET` | `/api/v1/analytics/overview` | MTTR, doc gaps & query metrics | `noc_lead`, `system_admin`, `content_admin`, `sme_senior` |

---

## 🔒 Default Seed Credentials

| Role | User Name | Email | Permissions |
|---|---|---|---|
| **Support Engineer (L1)** | Alex Chen | `alex.chen@company.internal` | Outage queries, feedback rating, flagging |
| **Senior / SME Engineer** | Sarah Miller | `sarah.sme@company.internal` | Flag review, all categories, resolution |
| **Content Admin** | Marcus Vance | `marcus.admin@company.internal` | Document upload, categorization, deprecation |
| **NOC Team Lead** | Elena Rostova | `elena.noc@company.internal` | MTTR tracking, query volume, gap metrics |
| **System Admin** | DevOps Admin | `admin@company.internal` | Full administrative control & audit logs |
