from pydantic import BaseModel
from typing import List, Optional, Any
import datetime

class CategoryBase(BaseModel):
    category_id: str
    name: str
    vendor: Optional[str] = None
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class DocumentChunkResponse(BaseModel):
    chunk_id: str
    doc_id: str
    section_ref: str
    content_text: str
    error_codes: List[str] = []
    keywords: List[str] = []
    chunk_index: int

    class Config:
        from_attributes = True

class DocumentBase(BaseModel):
    title: str
    vendor: Optional[str] = None
    category_id: str
    version: str = "1.0.0"

class DocumentCreate(DocumentBase):
    pass

class DocumentDeprecateRequest(BaseModel):
    reason: Optional[str] = "Deprecated by administrator"
    replacement_doc_id: Optional[str] = None

class DocumentResponse(DocumentBase):
    doc_id: str
    status: str
    filename: str
    file_type: str
    file_size_bytes: int
    uploaded_by: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class DocumentDetailResponse(DocumentResponse):
    category: Optional[CategoryResponse] = None
    chunks: List[DocumentChunkResponse] = []
