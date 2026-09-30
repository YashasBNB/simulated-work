import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class Category(Base):
    __tablename__ = "categories"

    category_id = Column(String(50), primary_key=True)  # e.g., "network_cisco", "k8s_infra", "database_pg", "auth_sso"
    name = Column(String(100), nullable=False)
    vendor = Column(String(100), nullable=True)          # e.g., "Cisco", "Kubernetes", "PostgreSQL", "AWS"
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    documents = relationship("Document", back_populates="category")

class Document(Base):
    __tablename__ = "documents"

    doc_id = Column(String(50), primary_key=True)
    title = Column(String(200), nullable=False)
    vendor = Column(String(100), nullable=True)
    category_id = Column(String(50), ForeignKey("categories.category_id"), nullable=False)
    version = Column(String(50), default="1.0.0")
    status = Column(String(20), default="active")  # 'active', 'deprecated', 'draft'
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(20), nullable=False)  # 'pdf', 'docx', 'txt', 'md'
    file_size_bytes = Column(Integer, default=0)
    uploaded_by = Column(String(50), ForeignKey("users.user_id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    category = relationship("Category", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    chunk_id = Column(String(50), primary_key=True)
    doc_id = Column(String(50), ForeignKey("documents.doc_id", ondelete="CASCADE"), nullable=False)
    section_ref = Column(String(255), nullable=False)  # e.g., "Section 3.2: Gateway Timeout Resolution"
    content_text = Column(Text, nullable=False)
    embedding_vector = Column(JSON, nullable=True)      # Vector as list of floats
    error_codes = Column(JSON, default=list)           # e.g. ["HTTP 504", "ERR_CONN_TIMEDOUT"]
    keywords = Column(JSON, default=list)              # Extracted technical keywords
    chunk_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="chunks")
