import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.seed import seed_database
from app.routers import (
    auth_router,
    documents_router,
    query_router,
    feedback_router,
    audit_router,
    analytics_router
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schemas
    Base.metadata.create_all(bind=engine)
    
    # Run seed script for roles, categories, users, and initial runbooks
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Mission-Critical AI Outage & Runbook Assistant Backend: Grounded troubleshooting, source citations, RBAC, and incident audit log.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for Web UI integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom latency header middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = round((time.time() - start_time) * 1000, 2)
    response.headers["X-Process-Time-Ms"] = str(process_time)
    return response

# Include feature routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(documents_router, prefix=settings.API_V1_STR)
app.include_router(query_router, prefix=settings.API_V1_STR)
app.include_router(feedback_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["System Health"])
def health_check():
    """Health and SLA readiness check."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "sla_p95_target_seconds": settings.P95_SLA_SECONDS,
        "version": "1.0.0"
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "AI Outage & Runbook Assistant API is active.",
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }
