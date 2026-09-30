import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.feedback import Feedback
from app.models.query import Answer, Query
from app.models.user import User
from app.schemas.feedback import FeedbackCreate, FeedbackReviewRequest, FeedbackResponse
from app.services.auth import get_current_user, require_roles
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/feedback", tags=["Feedback & SME Answer Review"])

@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
def submit_feedback(
    fb_in: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit helpful/unhelpful rating or flag an answer for SME review.
    Immediately alerts SMEs and admins if an answer is flagged.
    """
    answer = db.query(Answer).filter(Answer.answer_id == fb_in.answer_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="Target answer not found.")

    feedback_id = f"fb_{uuid.uuid4().hex[:12]}"
    new_feedback = Feedback(
        feedback_id=feedback_id,
        answer_id=fb_in.answer_id,
        user_id=current_user.user_id,
        rating=fb_in.rating,
        flagged=fb_in.flagged,
        flag_reason=fb_in.flag_reason,
        flag_details=fb_in.flag_details,
        flag_status="pending" if fb_in.flagged else "none"
    )
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)

    log_audit_event(
        db=db,
        action="ANSWER_FLAGGED" if fb_in.flagged else "FEEDBACK_SUBMITTED",
        entity="Feedback",
        entity_id=feedback_id,
        user_id=current_user.user_id,
        details={
            "answer_id": fb_in.answer_id,
            "rating": fb_in.rating,
            "flagged": fb_in.flagged,
            "flag_reason": fb_in.flag_reason
        }
    )

    query = answer.query
    return FeedbackResponse(
        feedback_id=new_feedback.feedback_id,
        answer_id=new_feedback.answer_id,
        user_id=new_feedback.user_id,
        rating=new_feedback.rating,
        flagged=new_feedback.flagged,
        flag_reason=new_feedback.flag_reason,
        flag_details=new_feedback.flag_details,
        flag_status=new_feedback.flag_status,
        reviewer_id=new_feedback.reviewer_id,
        reviewer_notes=new_feedback.reviewer_notes,
        resolution_action=new_feedback.resolution_action,
        reviewed_at=new_feedback.reviewed_at,
        created_at=new_feedback.created_at,
        updated_at=new_feedback.updated_at,
        query_text=query.query_text if query else None,
        answer_text=answer.response_text[:300] if answer else None
    )

@router.get("/flagged", response_model=List[FeedbackResponse])
def list_flagged_feedback(
    status_filter: Optional[str] = "pending",
    current_user: User = Depends(require_roles(["sme_senior", "content_admin", "system_admin", "noc_lead"])),
    db: Session = Depends(get_db)
):
    """
    List flagged answers for SME review to prevent repeated interruptions and correct documentation gaps.
    """
    query = db.query(Feedback).filter(Feedback.flagged == True)
    if status_filter and status_filter != "all":
        query = query.filter(Feedback.flag_status == status_filter)

    feedbacks = query.order_by(Feedback.created_at.desc()).all()

    results = []
    for fb in feedbacks:
        ans = fb.answer
        qry = ans.query if ans else None
        results.append(FeedbackResponse(
            feedback_id=fb.feedback_id,
            answer_id=fb.answer_id,
            user_id=fb.user_id,
            rating=fb.rating,
            flagged=fb.flagged,
            flag_reason=fb.flag_reason,
            flag_details=fb.flag_details,
            flag_status=fb.flag_status,
            reviewer_id=fb.reviewer_id,
            reviewer_notes=fb.reviewer_notes,
            resolution_action=fb.resolution_action,
            reviewed_at=fb.reviewed_at,
            created_at=fb.created_at,
            updated_at=fb.updated_at,
            query_text=qry.query_text if qry else None,
            answer_text=ans.response_text[:300] if ans else None
        ))
    return results

@router.post("/{feedback_id}/review", response_model=FeedbackResponse)
def review_flagged_feedback(
    feedback_id: str,
    review_in: FeedbackReviewRequest,
    current_user: User = Depends(require_roles(["sme_senior", "system_admin"])),
    db: Session = Depends(get_db)
):
    """
    SME or Admin resolves a flagged answer review.
    Updates flag status, records corrective resolution action and notes.
    """
    fb = db.query(Feedback).filter(Feedback.feedback_id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback entry not found.")

    fb.flag_status = review_in.flag_status
    fb.resolution_action = review_in.resolution_action
    fb.reviewer_notes = review_in.reviewer_notes
    fb.reviewer_id = current_user.user_id
    fb.reviewed_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(fb)

    log_audit_event(
        db=db,
        action="FLAG_REVIEWED",
        entity="Feedback",
        entity_id=feedback_id,
        user_id=current_user.user_id,
        details={
            "flag_status": review_in.flag_status,
            "resolution_action": review_in.resolution_action,
            "reviewer_notes": review_in.reviewer_notes
        }
    )

    ans = fb.answer
    qry = ans.query if ans else None

    return FeedbackResponse(
        feedback_id=fb.feedback_id,
        answer_id=fb.answer_id,
        user_id=fb.user_id,
        rating=fb.rating,
        flagged=fb.flagged,
        flag_reason=fb.flag_reason,
        flag_details=fb.flag_details,
        flag_status=fb.flag_status,
        reviewer_id=fb.reviewer_id,
        reviewer_notes=fb.reviewer_notes,
        resolution_action=fb.resolution_action,
        reviewed_at=fb.reviewed_at,
        created_at=fb.created_at,
        updated_at=fb.updated_at,
        query_text=qry.query_text if qry else None,
        answer_text=ans.response_text[:300] if ans else None
    )
