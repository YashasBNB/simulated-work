from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class ErrorCodeStat(BaseModel):
    error_code: str
    count: int
    resolved_count: int

class DocGap(BaseModel):
    query_text: str
    query_type: str
    unresolved_count: int
    last_queried_at: str

class FeedbackSummary(BaseModel):
    total_ratings: int
    helpful_count: int
    unhelpful_count: int
    helpful_percentage: float
    total_flags: int
    pending_flags: int
    resolved_flags: int

class DocumentStats(BaseModel):
    total_documents: int
    active_documents: int
    deprecated_documents: int
    total_chunks: int

class PerformanceMetrics(BaseModel):
    total_queries: int
    avg_latency_ms: float
    p95_latency_ms: float
    confident_percentage: float
    estimated_mttr_saved_minutes: float

class AnalyticsOverviewResponse(BaseModel):
    performance: PerformanceMetrics
    document_stats: DocumentStats
    feedback_summary: FeedbackSummary
    top_error_codes: List[ErrorCodeStat]
    documentation_gaps: List[DocGap]
