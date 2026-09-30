import os
import uuid
from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.document import Document, DocumentChunk, Category
from app.models.user import User
from app.schemas.document import (
    CategoryResponse, CategoryCreate,
    DocumentResponse, DocumentDetailResponse,
    DocumentDeprecateRequest
)
from app.services.auth import get_current_user, require_roles
from app.services.ingestion import process_file_into_chunks
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/documents", tags=["Documents & Ingestion"])

@router.get("/categories", response_model=List[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    """List all document categories."""
    return db.query(Category).all()

@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    cat_in: CategoryCreate,
    current_user: User = Depends(require_roles(["content_admin", "system_admin"])),
    db: Session = Depends(get_db)
):
    """Create a new document category (Content Admin / System Admin only)."""
    existing = db.query(Category).filter(Category.category_id == cat_in.category_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Category '{cat_in.category_id}' already exists.")

    new_cat = Category(
        category_id=cat_in.category_id,
        name=cat_in.name,
        vendor=cat_in.vendor,
        description=cat_in.description
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)

    log_audit_event(
        db=db,
        action="CATEGORY_CREATED",
        entity="Category",
        entity_id=new_cat.category_id,
        user_id=current_user.user_id,
        details={"name": new_cat.name, "vendor": new_cat.vendor}
    )

    return new_cat

@router.get("", response_model=List[DocumentResponse])
def list_documents(
    status: Optional[str] = None,
    category_id: Optional[str] = None,
    vendor: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List documents filtered by status, category, or vendor.
    Respects user RBAC permissions for non-admin roles.
    """
    query = db.query(Document)

    # RBAC filter for category access
    permitted = current_user.role.permitted_categories or []
    if "*" not in permitted:
        query = query.filter(Document.category_id.in_(permitted))

    if status:
        query = query.filter(Document.status == status)
    if category_id:
        query = query.filter(Document.category_id == category_id)
    if vendor:
        query = query.filter(Document.vendor.ilike(f"%{vendor}%"))

    return query.order_by(Document.created_at.desc()).all()

@router.get("/{doc_id}", response_model=DocumentDetailResponse)
def get_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get full document details including parsed chunks."""
    doc = db.query(Document).filter(Document.doc_id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    permitted = current_user.role.permitted_categories or []
    if "*" not in permitted and doc.category_id not in permitted:
        raise HTTPException(status_code=403, detail="Access denied to this document category")

    return doc

@router.post("/upload", response_model=DocumentDetailResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    category_id: str = Form(...),
    vendor: Optional[str] = Form(None),
    version: str = Form("1.0.0"),
    current_user: User = Depends(require_roles(["content_admin", "system_admin"])),
    db: Session = Depends(get_db)
):
    """
    Ingest, parse, and index a PDF, DOCX, TXT, or Markdown runbook.
    Extracts sections, error codes, keywords, and dense embeddings.
    """
    category = db.query(Category).filter(Category.category_id == category_id).first()
    if not category:
        raise HTTPException(status_code=400, detail=f"Category '{category_id}' does not exist.")

    doc_id = f"doc_{uuid.uuid4().hex[:10]}"
    ext = Path(file.filename or "doc.txt").suffix.lower()
    allowed_exts = [".pdf", ".docx", ".doc", ".txt", ".md"]
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'. Supported: {allowed_exts}")

    dest_filename = f"{doc_id}_{file.filename}"
    dest_path = Path(settings.UPLOAD_DIR) / dest_filename

    # Save file to disk
    file_bytes = await file.read()
    with open(dest_path, "wb") as f:
        f.write(file_bytes)

    # Process and chunk the document
    file_type = ext.lstrip(".")
    chunks_data = process_file_into_chunks(str(dest_path), file_type)

    if not chunks_data:
        raise HTTPException(status_code=400, detail="Failed to extract any text or sections from document.")

    new_doc = Document(
        doc_id=doc_id,
        title=title,
        vendor=vendor or category.vendor,
        category_id=category_id,
        version=version,
        status="active",
        filename=file.filename or dest_filename,
        file_path=str(dest_path),
        file_type=file_type,
        file_size_bytes=len(file_bytes),
        uploaded_by=current_user.user_id
    )
    db.add(new_doc)
    db.flush()

    for item in chunks_data:
        chunk = DocumentChunk(
            chunk_id=f"chk_{uuid.uuid4().hex[:12]}",
            doc_id=doc_id,
            section_ref=item["section_ref"],
            content_text=item["content_text"],
            embedding_vector=item["embedding_vector"],
            error_codes=item["error_codes"],
            keywords=item["keywords"],
            chunk_index=item["chunk_index"]
        )
        db.add(chunk)

    db.commit()
    db.refresh(new_doc)

    log_audit_event(
        db=db,
        action="DOCUMENT_UPLOADED",
        entity="Document",
        entity_id=doc_id,
        user_id=current_user.user_id,
        details={
            "title": title,
            "category_id": category_id,
            "version": version,
            "chunks_count": len(chunks_data),
            "file_size_bytes": len(file_bytes)
        }
    )

    return new_doc

@router.post("/{doc_id}/deprecate", response_model=DocumentResponse)
def deprecate_document(
    doc_id: str,
    deprecate_req: DocumentDeprecateRequest,
    current_user: User = Depends(require_roles(["content_admin", "system_admin"])),
    db: Session = Depends(get_db)
):
    """
    Deprecate a document runbook. Deprecated docs are excluded from query results
    to prevent stale runbooks from causing outage delays or incorrect steps.
    """
    doc = db.query(Document).filter(Document.doc_id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.status == "deprecated":
        raise HTTPException(status_code=400, detail="Document is already deprecated.")

    doc.status = "deprecated"
    db.commit()
    db.refresh(doc)

    log_audit_event(
        db=db,
        action="DOCUMENT_DEPRECATED",
        entity="Document",
        entity_id=doc_id,
        user_id=current_user.user_id,
        details={
            "title": doc.title,
            "reason": deprecate_req.reason,
            "replacement_doc_id": deprecate_req.replacement_doc_id
        }
    )

    return doc
