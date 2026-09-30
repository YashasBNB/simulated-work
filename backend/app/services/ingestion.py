import re
import math
import hashlib
from typing import List, Dict, Any, Tuple
from pathlib import Path
import pymupdf
import docx
from app.config import settings

# Comprehensive regex patterns for error codes commonly seen during infrastructure outages
ERROR_CODE_PATTERNS = [
    r"\b(?:HTTP[ -]?)?(?:4\d{2}|5\d{2})\b",                         # HTTP 404, 500, 502, 503, 504
    r"\bERR_[A-Z0-9_]+\b",                                           # ERR_CONNECTION_REFUSED, ERR_CONN_TIMEDOUT
    r"\b(?:ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|EADDRINUSE)\b", # POSIX networking
    r"\b(?:CrashLoopBackOff|OOMKilled|ImagePullBackOff|NodeNotReady|CreateContainerConfigError)\b", # K8s
    r"\bORA-\d{4,5}\b",                                              # Oracle DB errors
    r"\bPGRES_[A-Z_]+\b",                                            # PostgreSQL
    r"\bSQLSTATE\[[A-Z0-9]+\]\b",                                    # SQLSTATE
    r"\b(?:SEC|SYS|NET|OS|AWS|GCP|AZ)-\d{3,6}\b",                    # Vendor codes
    r"\b0x[0-9a-fA-F]{4,8}\b"                                        # Hex codes (e.g. 0x80004005)
]

STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but",
    "by", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from",
    "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him",
    "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "me", "more",
    "most", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
    "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should", "so",
    "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there",
    "these", "they", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
    "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why", "with", "would",
    "you", "your", "yours", "yourself", "yourselves"
}

def extract_error_codes(text: str) -> List[str]:
    """Find and normalize technical error codes in text."""
    found = set()
    for pattern in ERROR_CODE_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for m in matches:
            found.add(m.strip().upper())
    return sorted(list(found))

def extract_keywords(text: str, top_n: int = 15) -> List[str]:
    """Tokenize and extract high-signal technical keywords."""
    tokens = re.findall(r"\b[a-zA-Z0-9_\-\.]{3,30}\b", text.lower())
    freq: Dict[str, int] = {}
    for token in tokens:
        if token not in STOP_WORDS and not token.isdigit():
            freq[token] = freq.get(token, 0) + 1
    sorted_keywords = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    return [word for word, count in sorted_keywords[:top_n]]

def compute_dense_embedding(text: str, dimension: int = settings.EMBEDDING_DIMENSION) -> List[float]:
    """
    Generate a normalized semantic feature embedding vector.
    Combines n-gram hashing and character-trigram distribution with tf weighting,
    normalized to unit L2 norm so cosine similarity can be computed via dot product.
    """
    vec = [0.0] * dimension
    tokens = re.findall(r"\b[a-zA-Z0-9_\-\.]{2,30}\b", text.lower())
    
    if not tokens:
        return vec

    # Feature hashing with trigrams and tokens
    for i, token in enumerate(tokens):
        # Full token hash
        h = int(hashlib.sha256(token.encode("utf-8")).hexdigest()[:8], 16)
        idx = h % dimension
        vec[idx] += 1.5

        # Subword trigrams
        for j in range(len(token) - 2):
            trigram = token[j:j+3]
            th = int(hashlib.md5(trigram.encode("utf-8")).hexdigest()[:8], 16)
            t_idx = th % dimension
            vec[t_idx] += 0.5

    # L2 normalize
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [round(x / norm, 5) for x in vec]
    return vec

def parse_pdf_document(file_path: str) -> List[Dict[str, Any]]:
    """Extract sections and text chunks from PDF using PyMuPDF."""
    doc = pymupdf.open(file_path)
    sections: List[Dict[str, Any]] = []
    
    current_section = "Overview / General"
    current_text = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        lines = text.split("\n")
        
        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue

            # Detect potential section headers (e.g. "Section 1", "Chapter 2", "Error: ...", or short all-caps lines)
            is_header = (
                re.match(r"^(?:Section|Chapter|\d+\.|\d+\.\d+)\s+.*", line_str, re.IGNORECASE)
                or (len(line_str) < 60 and line_str.isupper() and len(line_str.split()) <= 6)
            )

            if is_header:
                if current_text:
                    section_content = "\n".join(current_text).strip()
                    if len(section_content) > 30:
                        sections.append({
                            "section_ref": f"Page {page_num + 1} - {current_section}",
                            "content": section_content
                        })
                    current_text = []
                current_section = line_str
            else:
                current_text.append(line_str)

    if current_text:
        section_content = "\n".join(current_text).strip()
        if len(section_content) > 30:
            sections.append({
                "section_ref": f"Page {len(doc)} - {current_section}",
                "content": section_content
            })

    doc.close()
    return sections

def parse_docx_document(file_path: str) -> List[Dict[str, Any]]:
    """Extract sections and text chunks from DOCX files."""
    doc = docx.Document(file_path)
    sections: List[Dict[str, Any]] = []
    
    current_section = "General Overview"
    current_text = []

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue

        if para.style.name.startswith("Heading") or re.match(r"^\d+\.\s+", text):
            if current_text:
                content = "\n".join(current_text).strip()
                if len(content) > 30:
                    sections.append({
                        "section_ref": current_section,
                        "content": content
                    })
                current_text = []
            current_section = text
        else:
            current_text.append(text)

    if current_text:
        content = "\n".join(current_text).strip()
        if len(content) > 30:
            sections.append({
                "section_ref": current_section,
                "content": content
            })

    return sections

def parse_text_or_markdown(file_path: str) -> List[Dict[str, Any]]:
    """Extract sections from Markdown or plain text runbooks."""
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    lines = content.split("\n")
    sections: List[Dict[str, Any]] = []
    current_section = "Overview"
    current_text = []

    for line in lines:
        line_str = line.strip()
        # Markdown headings or Section headers
        if re.match(r"^#{1,4}\s+", line_str) or re.match(r"^(?:Section|Procedure|Step|Runbook)\s+.*", line_str, re.IGNORECASE):
            if current_text:
                sec_text = "\n".join(current_text).strip()
                if len(sec_text) > 30:
                    sections.append({
                        "section_ref": current_section,
                        "content": sec_text
                    })
                current_text = []
            current_section = line_str.lstrip("#").strip()
        else:
            current_text.append(line)

    if current_text:
        sec_text = "\n".join(current_text).strip()
        if len(sec_text) > 30:
            sections.append({
                "section_ref": current_section,
                "content": sec_text
            })

    return sections

def chunk_document_content(sections: List[Dict[str, Any]], max_words_per_chunk: int = 350) -> List[Dict[str, Any]]:
    """
    Subdivide large sections into coherent chunks with overlap,
    tagging each chunk with error codes, extracted keywords, and dense embeddings.
    """
    chunks = []
    chunk_index = 0

    for sec in sections:
        section_ref = sec["section_ref"]
        content = sec["content"]
        words = content.split()

        if len(words) <= max_words_per_chunk:
            error_codes = extract_error_codes(content)
            keywords = extract_keywords(content)
            embedding = compute_dense_embedding(f"{section_ref}\n{content}")
            chunks.append({
                "section_ref": section_ref,
                "content_text": content,
                "error_codes": error_codes,
                "keywords": keywords,
                "embedding_vector": embedding,
                "chunk_index": chunk_index
            })
            chunk_index += 1
        else:
            # Sliding window chunking with 50-word overlap
            step = max_words_per_chunk - 50
            for start in range(0, len(words), step):
                chunk_words = words[start:start + max_words_per_chunk]
                chunk_text = " ".join(chunk_words)
                if len(chunk_text.strip()) < 40:
                    continue
                error_codes = extract_error_codes(chunk_text)
                keywords = extract_keywords(chunk_text)
                embedding = compute_dense_embedding(f"{section_ref}\n{chunk_text}")
                chunks.append({
                    "section_ref": f"{section_ref} (Part {start // step + 1})",
                    "content_text": chunk_text,
                    "error_codes": error_codes,
                    "keywords": keywords,
                    "embedding_vector": embedding,
                    "chunk_index": chunk_index
                })
                chunk_index += 1

    return chunks

def process_file_into_chunks(file_path: str, file_type: str) -> List[Dict[str, Any]]:
    """Main ingestion coordinator for any supported file format."""
    file_type_lower = file_type.lower().lstrip(".")
    if file_type_lower == "pdf":
        sections = parse_pdf_document(file_path)
    elif file_type_lower in ["docx", "doc"]:
        sections = parse_docx_document(file_path)
    else:
        # Default to markdown/text parser
        sections = parse_text_or_markdown(file_path)

    if not sections:
        # Fallback if document had no distinct headings
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            raw_text = f.read()
        sections = [{"section_ref": "Full Document", "content": raw_text}]

    return chunk_document_content(sections)
