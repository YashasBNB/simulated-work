# Simulated Work: Mission-Critical Incident & Runbook Platform

A production-grade platform designed to streamline troubleshooting during high-severity outages, reduce Mean Time to Resolution (MTTR), and eliminate dependency on senior engineers.

## Backend Service

The backend is built with **FastAPI**, **SQLAlchemy**, and a **Hybrid Vector + Keyword Retrieval Engine** with strict citations and role-based access control.

👉 Full documentation, architecture diagram, and API guides: [backend/README.md](file:///Users/yashasnaidu/simulated-work/backend/README.md)

### Key Features Implemented:
- **Natural Language & Error-Code Search** with Top-3 Ranking for Error Codes (`CrashLoopBackOff`, `504 Gateway Timeout`, `ORA-01017`, `ERR_CONNECTION_REFUSED`).
- **100% Grounded Citations**: Every answer cites Document Title, Version, and Section Reference — or returns *"No confident answer found"*.
- **Role-Based Access Control (RBAC)** across 5 enterprise personas (Support Engineer L1, Senior SME, Content Admin, NOC Lead, System Admin).
- **Document Ingestion & Parsing**: Native support for **PDF**, **DOCX**, **Markdown**, and **Text** runbooks with section detection and dense semantic embeddings.
- **Document Deprecation Workflow**: Stale runbooks are marked deprecated and immediately excluded from incident search.
- **Feedback & Answer Flagging Loop**: Flagged answers queue for Senior SME engineers to review and resolve documentation issues.
- **Observability & Analytics Dashboard**: MTTR tracking, P95 latency measurements, documentation gap detection, and full compliance audit logging.
- **Automated Test Suite**: 15 unit and integration tests passing in under a second.

### Running the Backend:
```bash
cd backend
./run.sh
```
Interactive API documentation available at `http://localhost:8000/docs`.
