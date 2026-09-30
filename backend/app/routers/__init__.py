from app.routers.auth import router as auth_router
from app.routers.documents import router as documents_router
from app.routers.query import router as query_router
from app.routers.feedback import router as feedback_router
from app.routers.audit import router as audit_router
from app.routers.analytics import router as analytics_router

__all__ = [
    "auth_router",
    "documents_router",
    "query_router",
    "feedback_router",
    "audit_router",
    "analytics_router"
]
