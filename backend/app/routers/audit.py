from typing import List, Optional
from fastapi import APIRouter, Depends, Query as FastQuery
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogResponse
from app.services.auth import require_roles

router = APIRouter(prefix="/audit", tags=["Audit Log & Compliance"])

@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = None,
    entity: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = FastQuery(50, le=200),
    current_user: User = Depends(require_roles(["system_admin", "noc_lead", "content_admin"])),
    db: Session = Depends(get_db)
):
    """
    Query system audit log trail.
    Enforces compliance and traceability for queries, document changes, and role permissions.
    """
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if entity:
        query = query.filter(AuditLog.entity == entity)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    return query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
