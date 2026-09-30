import time
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.query import Query, Answer
from app.models.user import User
from app.schemas.query import QueryRequest, AnswerResponse, QueryHistoryItem
from app.services.auth import get_current_user
from app.services.retrieval import search_chunks_hybrid
from app.services.llm_service import generate_grounded_answer
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/query", tags=["Query & Search Assistant"])

@router.post("", response_model=AnswerResponse)
def execute_query(
    query_in: QueryRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search runbooks using Natural Language or Error Codes.
    - Grounded strictly in authorized documents (RBAC enforced).
    - Excludes deprecated documents.
    - Error codes ranked top-3.
    - 100% of answers show document, section, version — or 'no confident answer'.
    - SLA P95 <= 5s.
    """
    start_time = time.time()
    clean_query = query_in.query_text.strip()
    if not clean_query:
        raise HTTPException(status_code=400, detail="Query text cannot be empty.")

    # 1. Hybrid Retrieval (Error code boost + BM25 keyword + dense vector + RBAC filter)
    retrieval_res = search_chunks_hybrid(
        db=db,
        query_text=clean_query,
        user_role=current_user.role,
        category_filter=query_in.category_filter
    )

    query_type = retrieval_res["query_type"]
    detected_error_codes = retrieval_res["detected_error_codes"]
    ranked_chunks = retrieval_res["ranked_chunks"]

    # 2. Grounded Answer Synthesis with Source Citations & SLA Confidence Check
    response_text, confidence, is_confident, citations = generate_grounded_answer(
        query_text=clean_query,
        ranked_chunks=ranked_chunks
    )

    elapsed_ms = round((time.time() - start_time) * 1000, 2)

    # 3. Persist Query & Answer records for history, audit, and MTTR tracking
    query_id = f"qry_{uuid.uuid4().hex[:12]}"
    answer_id = f"ans_{uuid.uuid4().hex[:12]}"

    db_query = Query(
        query_id=query_id,
        user_id=current_user.user_id,
        query_text=clean_query,
        query_type=query_type,
        detected_error_codes=detected_error_codes,
        latency_ms=elapsed_ms
    )
    db.add(db_query)
    db.flush()

    cited_chunk_ids = [c.chunk_id for c in citations]
    citations_data = [c.model_dump() for c in citations]

    db_answer = Answer(
        answer_id=answer_id,
        query_id=query_id,
        response_text=response_text,
        confidence=confidence,
        is_confident=is_confident,
        cited_chunk_ids=cited_chunk_ids,
        citations=citations_data
    )
    db.add(db_answer)
    db.commit()
    db.refresh(db_answer)

    # 4. Audit Log
    log_audit_event(
        db=db,
        action="QUERY_EXECUTED",
        entity="Query",
        entity_id=query_id,
        user_id=current_user.user_id,
        details={
            "query_type": query_type,
            "detected_error_codes": detected_error_codes,
            "confidence": confidence,
            "is_confident": is_confident,
            "citations_count": len(citations),
            "latency_ms": elapsed_ms
        },
        ip_address=request.client.host if request.client else None
    )

    return AnswerResponse(
        answer_id=answer_id,
        query_id=query_id,
        query_text=clean_query,
        query_type=query_type,
        detected_error_codes=detected_error_codes,
        response_text=response_text,
        confidence=confidence,
        is_confident=is_confident,
        citations=citations,
        latency_ms=elapsed_ms,
        created_at=db_answer.created_at
    )

@router.get("/history", response_model=List[QueryHistoryItem])
def get_query_history(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve the current user's past queries and answers."""
    queries = (
        db.query(Query)
        .filter(Query.user_id == current_user.user_id)
        .order_by(Query.created_at.desc())
        .limit(limit)
        .all()
    )

    history_items = []
    for q in queries:
        ans_resp = None
        if q.answer:
            ans_resp = AnswerResponse(
                answer_id=q.answer.answer_id,
                query_id=q.query_id,
                query_text=q.query_text,
                query_type=q.query_type,
                detected_error_codes=q.detected_error_codes or [],
                response_text=q.answer.response_text,
                confidence=q.answer.confidence,
                is_confident=q.answer.is_confident,
                citations=q.answer.citations or [],
                latency_ms=q.latency_ms,
                created_at=q.answer.created_at
            )
        history_items.append(QueryHistoryItem(
            query_id=q.query_id,
            query_text=q.query_text,
            query_type=q.query_type,
            created_at=q.created_at,
            answer=ans_resp
        ))

    return history_items
