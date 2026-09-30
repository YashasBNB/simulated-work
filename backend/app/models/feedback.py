import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Boolean, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Feedback(Base):
    __tablename__ = "feedbacks"

    feedback_id = Column(String(50), primary_key=True)
    answer_id = Column(String(50), ForeignKey("answers.answer_id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(50), ForeignKey("users.user_id"), nullable=False)
    
    # Rating: 1 = Helpful (thumbs up), -1 = Unhelpful (thumbs down), 0 = neutral/flag-only
    rating = Column(Integer, default=0)
    
    # Flagging workflow
    flagged = Column(Boolean, default=False)
    flag_reason = Column(String(255), nullable=True)  # e.g., "hallucinated step", "outdated runbook", "incorrect command"
    flag_details = Column(Text, nullable=True)
    flag_status = Column(String(50), default="pending")  # "none", "pending", "reviewed", "resolved"
    
    # SME Review
    reviewer_id = Column(String(50), ForeignKey("users.user_id"), nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    resolution_action = Column(String(100), nullable=True)  # "doc_updated", "doc_deprecated", "false_positive", "wont_fix"
    reviewed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    answer = relationship("Answer", back_populates="feedbacks")
    user = relationship("User", foreign_keys=[user_id], back_populates="feedbacks")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
