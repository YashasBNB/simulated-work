import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class Role(Base):
    __tablename__ = "roles"

    role_id = Column(String(50), primary_key=True)  # e.g., "support_l1", "sme_senior", "content_admin", "noc_lead", "system_admin"
    role_name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    permitted_categories = Column(JSON, nullable=False, default=list)  # list of category_ids or ["*"] for all
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    users = relationship("User", back_populates="role")

class User(Base):
    __tablename__ = "users"

    user_id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    role_id = Column(String(50), ForeignKey("roles.role_id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    role = relationship("Role", back_populates="users")
    queries = relationship("Query", back_populates="user")
    feedbacks = relationship("Feedback", back_populates="user", foreign_keys="Feedback.user_id")
    audit_logs = relationship("AuditLog", back_populates="user")
