from pydantic import BaseModel
from typing import Optional
import datetime

class FeedbackCreate(BaseModel):
    answer_id: str
    rating: int = 0  # 1 for helpful, -1 for unhelpful, 0 for neutral/flag-only
    flagged: bool = False
    flag_reason: Optional[str] = None  # e.g., "hallucinated step", "outdated runbook", "incorrect command", "safety risk"
    flag_details: Optional[str] = None

class FeedbackReviewRequest(BaseModel):
    flag_status: str  # "reviewed", "resolved", "dismissed"
    resolution_action: Optional[str] = None  # "doc_updated", "doc_deprecated", "false_positive", "wont_fix"
    reviewer_notes: Optional[str] = None

class FeedbackResponse(BaseModel):
    feedback_id: str
    answer_id: str
    user_id: str
    rating: int
    flagged: bool
    flag_reason: Optional[str] = None
    flag_details: Optional[str] = None
    flag_status: str
    reviewer_id: Optional[str] = None
    reviewer_notes: Optional[str] = None
    resolution_action: Optional[str] = None
    reviewed_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    
    # Context enrichment
    query_text: Optional[str] = None
    answer_text: Optional[str] = None

    class Config:
        from_attributes = True
