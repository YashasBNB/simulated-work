from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.analytics import AnalyticsOverviewResponse
from app.services.auth import require_roles
from app.services.analytics_service import get_analytics_overview

router = APIRouter(prefix="/analytics", tags=["Analytics & MTTR Dashboard"])

@router.get("/overview", response_model=AnalyticsOverviewResponse)
def get_analytics(
    current_user: User = Depends(require_roles(["noc_lead", "system_admin", "content_admin", "sme_senior"])),
    db: Session = Depends(get_db)
):
    """
    Get NOC & Admin operational dashboard metrics:
    - MTTR reduction and estimated engineering minutes saved
    - Query latency metrics (Average and P95)
    - Active vs Deprecated document health
    - Feedback ratings and pending SME flags
    - Top error codes and documentation gaps
    """
    return get_analytics_overview(db)
