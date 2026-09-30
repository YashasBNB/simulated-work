from pydantic import BaseModel
from typing import List, Optional, Any
import datetime

class Citation(BaseModel):
    chunk_id: str
    doc_id: str
    title: str
    version: str
    vendor: Optional[str] = None
    category_id: str
    category_name: Optional[str] = None
    section_ref: str
    snippet: str
    relevance_score: float

class QueryRequest(BaseModel):
    query_text: str
    category_filter: Optional[str] = None

class AnswerResponse(BaseModel):
    answer_id: str
    query_id: str
    query_text: str
    query_type: str  # "nl" or "error_code"
    detected_error_codes: List[str] = []
    response_text: str
    confidence: float
    is_confident: bool
    citations: List[Citation] = []
    latency_ms: float
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class QueryHistoryItem(BaseModel):
    query_id: str
    query_text: str
    query_type: str
    created_at: datetime.datetime
    answer: Optional[AnswerResponse] = None

    class Config:
        from_attributes = True
