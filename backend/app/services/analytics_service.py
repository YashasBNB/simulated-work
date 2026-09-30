from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.query import Query, Answer
from app.models.document import Document, DocumentChunk
from app.models.feedback import Feedback
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    PerformanceMetrics,
    DocumentStats,
    FeedbackSummary,
    ErrorCodeStat,
    DocGap
)

# Benchmark: An average outage investigation takes ~30 mins without runbooks vs ~5 mins with instant cited steps = ~25 mins saved per query
MINUTES_SAVED_PER_CONFIDENT_QUERY = 25.0

def get_analytics_overview(db: Session) -> AnalyticsOverviewResponse:
    """Aggregate real-time metrics for NOC leads, Content Admins, and Engineering Managers."""
    # 1. Query & Performance Metrics
    queries = db.query(Query).all()
    total_queries = len(queries)
    
    latencies = [q.latency_ms for q in queries if q.latency_ms > 0]
    avg_latency = round(sum(latencies) / len(latencies), 2) if latencies else 0.0
    
    # Calculate P95 latency
    if latencies:
        sorted_lat = sorted(latencies)
        p95_idx = int(0.95 * len(sorted_lat))
        p95_latency = round(sorted_lat[min(p95_idx, len(sorted_lat) - 1)], 2)
    else:
        p95_latency = 0.0

    answers = db.query(Answer).all()
    confident_answers = [a for a in answers if a.is_confident]
    confident_pct = round((len(confident_answers) / len(answers) * 100), 1) if answers else 100.0

    estimated_mttr_saved = round(len(confident_answers) * MINUTES_SAVED_PER_CONFIDENT_QUERY, 1)

    performance = PerformanceMetrics(
        total_queries=total_queries,
        avg_latency_ms=avg_latency,
        p95_latency_ms=p95_latency,
        confident_percentage=confident_pct,
        estimated_mttr_saved_minutes=estimated_mttr_saved
    )

    # 2. Document Metrics
    total_docs = db.query(Document).count()
    active_docs = db.query(Document).filter(Document.status == "active").count()
    deprecated_docs = db.query(Document).filter(Document.status == "deprecated").count()
    total_chunks = db.query(DocumentChunk).count()

    doc_stats = DocumentStats(
        total_documents=total_docs,
        active_documents=active_docs,
        deprecated_documents=deprecated_docs,
        total_chunks=total_chunks
    )

    # 3. Feedback Metrics
    feedbacks = db.query(Feedback).all()
    total_ratings = len([f for f in feedbacks if f.rating != 0])
    helpful_count = len([f for f in feedbacks if f.rating == 1])
    unhelpful_count = len([f for f in feedbacks if f.rating == -1])
    helpful_pct = round((helpful_count / total_ratings * 100), 1) if total_ratings > 0 else 100.0

    total_flags = len([f for f in feedbacks if f.flagged])
    pending_flags = len([f for f in feedbacks if f.flagged and f.flag_status == "pending"])
    resolved_flags = len([f for f in feedbacks if f.flagged and f.flag_status in ["resolved", "reviewed"]])

    feedback_summary = FeedbackSummary(
        total_ratings=total_ratings,
        helpful_count=helpful_count,
        unhelpful_count=unhelpful_count,
        helpful_percentage=helpful_pct,
        total_flags=total_flags,
        pending_flags=pending_flags,
        resolved_flags=resolved_flags
    )

    # 4. Top Error Codes Queried
    error_code_counts: Dict[str, Dict[str, int]] = {}
    for q in queries:
        codes = q.detected_error_codes or []
        for code in codes:
            if code not in error_code_counts:
                error_code_counts[code] = {"count": 0, "resolved": 0}
            error_code_counts[code]["count"] += 1
            if q.answer and q.answer.is_confident:
                error_code_counts[code]["resolved"] += 1

    top_error_codes = [
        ErrorCodeStat(
            error_code=code,
            count=data["count"],
            resolved_count=data["resolved"]
        )
        for code, data in sorted(error_code_counts.items(), key=lambda x: x[1]["count"], reverse=True)[:10]
    ]

    # 5. Documentation Gaps (Queries that yielded 'no confident answer' or were flagged)
    gap_queries = (
        db.query(Query)
        .join(Answer, Query.query_id == Answer.query_id)
        .filter(Answer.is_confident == False)
        .order_by(Query.created_at.desc())
        .limit(20)
        .all()
    )

    gap_dict: Dict[str, Dict[str, Any]] = {}
    for gq in gap_queries:
        norm_text = gq.query_text.strip().lower()
        if norm_text not in gap_dict:
            gap_dict[norm_text] = {
                "text": gq.query_text.strip(),
                "type": gq.query_type,
                "count": 0,
                "last_queried": gq.created_at.strftime("%Y-%m-%d %H:%M UTC")
            }
        gap_dict[norm_text]["count"] += 1

    doc_gaps = [
        DocGap(
            query_text=data["text"],
            query_type=data["type"],
            unresolved_count=data["count"],
            last_queried_at=data["last_queried"]
        )
        for data in sorted(gap_dict.values(), key=lambda x: x["count"], reverse=True)
    ]

    return AnalyticsOverviewResponse(
        performance=performance,
        document_stats=doc_stats,
        feedback_summary=feedback_summary,
        top_error_codes=top_error_codes,
        documentation_gaps=doc_gaps
    )
