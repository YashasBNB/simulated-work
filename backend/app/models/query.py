import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Float, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class Query(Base):
    __tablename__ = "queries"

    query_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.user_id"), nullable=False)
    query_text = Column(Text, nullable=False)
    query_type = Column(String(20), default="nl")  # "nl" (natural language) or "error_code"
    detected_error_codes = Column(JSON, default=list)
    latency_ms = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="queries")
    answer = relationship("Answer", uselist=False, back_populates="query", cascade="all, delete-orphan")

class Answer(Base):
    __tablename__ = "answers"

    answer_id = Column(String(50), primary_key=True)
    query_id = Column(String(50), ForeignKey("queries.query_id", ondelete="CASCADE"), unique=True, nullable=False)
    response_text = Column(Text, nullable=False)
    confidence = Column(Float, default=0.0)
    is_confident = Column(Boolean, default=True)  # False if "no confident answer" / not found
    cited_chunk_ids = Column(JSON, default=list)  # list of chunk_ids cited
    citations = Column(JSON, default=list)        # list of {doc_id, title, version, section_ref, vendor}
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    query = relationship("Query", back_populates="answer")
    feedbacks = relationship("Feedback", back_populates="answer", cascade="all, delete-orphan")
