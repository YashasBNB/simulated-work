from pydantic import BaseModel
from typing import Optional, Dict, Any
import datetime

class AuditLogResponse(BaseModel):
    log_id: str
    user_id: Optional[str] = None
    action: str
    entity: str
    entity_id: Optional[str] = None
    details: Dict[str, Any] = {}
    ip_address: Optional[str] = None
    timestamp: datetime.datetime

    class Config:
        from_attributes = True
