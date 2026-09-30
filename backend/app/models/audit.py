import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.user_id"), nullable=True)
    action = Column(String(100), nullable=False)  # "QUERY_SUBMITTED", "DOCUMENT_UPLOADED", "DOCUMENT_DEPRECATED", "FEEDBACK_SUBMITTED", "ANSWER_FLAGGED", "FLAG_RESOLVED", "ROLE_UPDATED"
    entity = Column(String(50), nullable=False)   # "Query", "Document", "Feedback", "Role", "User"
    entity_id = Column(String(50), nullable=True)
    details = Column(JSON, default=dict)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")
