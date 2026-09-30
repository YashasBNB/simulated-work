import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.document import Document, DocumentChunk, Category
from app.models.user import Role
from app.services.ingestion import extract_error_codes, compute_dense_embedding
from app.config import settings

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Compute dot product of two unit-normalized vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    return max(0.0, min(1.0, sum(a * b for a, b in zip(v1, v2))))

def compute_keyword_overlap(query_text: str, content_text: str, keywords: List[str]) -> float:
    """Compute normalized token overlap between query terms and chunk content/keywords."""
    q_tokens = set(re.findall(r"\b[a-zA-Z0-9_\-\.]{2,30}\b", query_text.lower()))
    if not q_tokens:
        return 0.0
    
    content_lower = content_text.lower()
    matches = 0
    for token in q_tokens:
        if token in content_lower:
            matches += 1
        elif keywords and token in [k.lower() for k in keywords]:
            matches += 1

    return min(1.0, matches / len(q_tokens))

def search_chunks_hybrid(
    db: Session,
    query_text: str,
    user_role: Role,
    category_filter: Optional[str] = None,
    top_k: int = settings.MAX_RETRIEVED_CHUNKS
) -> Dict[str, Any]:
    """
    Execute hybrid retrieval combining:
    1. Error code exact matching and ranking boost
    2. BM25 / token keyword overlap
    3. Dense semantic vector similarity
    4. Strict RBAC category filtering and deprecation exclusion
    """
    detected_error_codes = extract_error_codes(query_text)
    is_error_code_query = len(detected_error_codes) > 0

    # 1. Base query with RBAC category permissions and active status constraint
    query = (
        db.query(DocumentChunk, Document, Category)
        .join(Document, DocumentChunk.doc_id == Document.doc_id)
        .join(Category, Document.category_id == Category.category_id)
        .filter(Document.status == "active")
    )

    # Enforce RBAC on permitted categories
    permitted = user_role.permitted_categories or []
    if "*" not in permitted:
        query = query.filter(Document.category_id.in_(permitted))

    # Optional user category filter
    if category_filter:
        query = query.filter(Document.category_id == category_filter)

    candidates = query.all()

    if not candidates:
        return {
            "query_type": "error_code" if is_error_code_query else "nl",
            "detected_error_codes": detected_error_codes,
            "ranked_chunks": []
        }

    query_embedding = compute_dense_embedding(query_text)

    scored_chunks = []
    for chunk, doc, cat in candidates:
        # A. Vector Cosine Similarity
        chunk_embedding = chunk.embedding_vector or []
        vec_score = cosine_similarity(query_embedding, chunk_embedding)

        # B. Keyword overlap score
        kw_score = compute_keyword_overlap(query_text, chunk.content_text, chunk.keywords or [])

        # C. Error code exact boost
        error_boost = 0.0
        has_error_match = False
        chunk_error_codes = [c.upper() for c in (chunk.error_codes or [])]

        for err in detected_error_codes:
            if err in chunk_error_codes or err in chunk.content_text.upper():
                error_boost = 0.50
                has_error_match = True
                break

        # If user typed an error code and this chunk has it, give significant priority
        if is_error_code_query:
            # Weighted hybrid score with error code prioritization
            combined_score = (error_boost * 0.45) + (kw_score * 0.35) + (vec_score * 0.20)
        else:
            combined_score = (vec_score * 0.55) + (kw_score * 0.45)

        # Cap score at 1.0
        final_score = min(1.0, combined_score)

        scored_chunks.append({
            "chunk": chunk,
            "doc": doc,
            "category": cat,
            "relevance_score": round(final_score, 4),
            "has_error_match": has_error_match,
            "vec_score": round(vec_score, 4),
            "kw_score": round(kw_score, 4)
        })

    # Sort chunks: if error code query, sort by has_error_match first, then relevance_score
    if is_error_code_query:
        scored_chunks.sort(key=lambda x: (1 if x["has_error_match"] else 0, x["relevance_score"]), reverse=True)
    else:
        scored_chunks.sort(key=lambda x: x["relevance_score"], reverse=True)

    ranked_top = scored_chunks[:top_k]

    return {
        "query_type": "error_code" if is_error_code_query else "nl",
        "detected_error_codes": detected_error_codes,
        "ranked_chunks": ranked_top
    }
