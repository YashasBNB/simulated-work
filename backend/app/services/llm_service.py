import os
import re
import json
from typing import List, Dict, Any, Tuple
import httpx
from app.config import settings
from app.schemas.query import Citation

NO_ANSWER_TEXT = "No confident answer found in authorized runbooks and configuration guides for this query."

def format_citations(ranked_chunks: List[Dict[str, Any]]) -> List[Citation]:
    """Convert ranked chunk dictionaries into schema Citation objects."""
    citations: List[Citation] = []
    for item in ranked_chunks:
        chunk = item["chunk"]
        doc = item["doc"]
        cat = item["category"]
        snippet = chunk.content_text[:220] + ("..." if len(chunk.content_text) > 220 else "")
        citations.append(Citation(
            chunk_id=chunk.chunk_id,
            doc_id=doc.doc_id,
            title=doc.title,
            version=doc.version,
            vendor=doc.vendor,
            category_id=cat.category_id,
            category_name=cat.name,
            section_ref=chunk.section_ref,
            snippet=snippet,
            relevance_score=item["relevance_score"]
        ))
    return citations

def call_anthropic_llm(query_text: str, context_blocks: List[str]) -> str | None:
    """Invoke Anthropic Claude API for grounded generation if API key is present."""
    if not settings.ANTHROPIC_API_KEY:
        return None
    try:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": settings.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        prompt_content = (
            "You are a Tier 1/2 Outage & Incident Runbook Assistant. "
            "STRICT RULES:\n"
            "1. Answer ONLY using the facts, steps, and commands from the Provided Runbook Context below.\n"
            "2. If the context does not contain the answer, say: 'No confident answer found in authorized runbooks and configuration guides for this query.'\n"
            "3. Format your response into: (A) Quick Assessment, (B) Step-by-Step Resolution Steps, (C) Verification Commands.\n"
            "4. Cite the document and section for each resolution step.\n\n"
            f"Query: {query_text}\n\n"
            "Provided Runbook Context:\n" + "\n\n".join(context_blocks)
        )
        payload = {
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 1024,
            "messages": [{"role": "user", "content": prompt_content}]
        }
        with httpx.Client(timeout=4.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["content"][0]["text"]
    except Exception:
        pass
    return None

def call_openai_llm(query_text: str, context_blocks: List[str]) -> str | None:
    """Invoke OpenAI API for grounded generation if API key is present."""
    if not settings.OPENAI_API_KEY:
        return None
    try:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        prompt_content = (
            "You are a Tier 1/2 Outage & Incident Runbook Assistant. "
            "STRICT RULES:\n"
            "1. Answer ONLY using the facts and steps from the Provided Context.\n"
            "2. Do not hallucinate. Cite the document and section for each resolution step.\n\n"
            f"Query: {query_text}\n\n"
            "Provided Context:\n" + "\n\n".join(context_blocks)
        )
        payload = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt_content}],
            "temperature": 0.1
        }
        with httpx.Client(timeout=4.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"]
    except Exception:
        pass
    return None

def synthesize_grounded_answer(query_text: str, ranked_chunks: List[Dict[str, Any]]) -> str:
    """
    Deterministic Grounded Extractive Reasoning Engine.
    Synthesizes exact troubleshooting steps, prerequisites, commands, and verification
    strictly from the authorized runbook chunks with exact citations.
    """
    top_item = ranked_chunks[0]
    top_chunk = top_item["chunk"]
    top_doc = top_item["doc"]

    lines = [line.strip() for line in top_chunk.content_text.split("\n") if line.strip()]
    
    # Extract resolution steps or commands
    steps = []
    commands = []
    for line in lines:
        if re.match(r"^(?:step|\d+[\.\)]|-|\*)\s+", line, re.IGNORECASE):
            steps.append(line)
        elif line.startswith("$ ") or line.startswith("# ") or any(cmd in line for cmd in ["kubectl", "systemctl", "curl", "ping", "psql", "docker", "netstat", "ip route", "grep"]):
            commands.append(line)

    response_parts = [
        f"### Resolution for: `{query_text.strip()}`",
        f"**Primary Source**: *{top_doc.title}* (Version `{top_doc.version}`, Vendor: `{top_doc.vendor or 'Internal'}`)",
        f"**Section Reference**: `{top_chunk.section_ref}`",
        ""
    ]

    # Quick Diagnosis / Troubleshooting Summary
    summary_lines = [l for l in lines[:3] if not l.startswith("#") and not l.startswith("$")]
    if summary_lines:
        response_parts.append("**Troubleshooting Summary:**")
        response_parts.append(" ".join(summary_lines))
        response_parts.append("")

    # Prescribed Steps
    response_parts.append("**Exact Troubleshooting Steps (Source-Grounded):**")
    if steps:
        for s in steps[:8]:
            response_parts.append(f"{s}")
    else:
        # Paragraph extraction
        for p in lines[:5]:
            response_parts.append(f"- {p}")
    response_parts.append("")

    # Verification / Diagnostic Commands
    if commands:
        response_parts.append("**Verification & Diagnostic Commands:**")
        response_parts.append("```bash")
        for cmd in commands[:5]:
            clean_cmd = cmd.lstrip("$# ")
            response_parts.append(clean_cmd)
        response_parts.append("```")
        response_parts.append("")

    # Source Attribution note
    response_parts.append(f"> **Verified Source Citation**: [{top_doc.title} - {top_chunk.section_ref} (v{top_doc.version})]")

    # If additional supporting chunks exist, note secondary citations
    if len(ranked_chunks) > 1:
        response_parts.append("")
        response_parts.append("**Additional Corroborating References:**")
        for sec_item in ranked_chunks[1:3]:
            s_doc = sec_item["doc"]
            s_chunk = sec_item["chunk"]
            response_parts.append(f"- *{s_doc.title}* (v{s_doc.version}) — `{s_chunk.section_ref}` (Relevance: {int(sec_item['relevance_score']*100)}%)")

    return "\n".join(response_parts)

def generate_grounded_answer(
    query_text: str,
    ranked_chunks: List[Dict[str, Any]],
    confidence_threshold: float = settings.CONFIDENCE_THRESHOLD
) -> Tuple[str, float, bool, List[Citation]]:
    """
    Generate grounded response adhering to strict acceptance criteria:
    - 100% of answers show document, section, version — or 'no confident answer'.
    - Mitigates hallucinated steps by grounding answers strictly in retrieved chunks.
    """
    if not ranked_chunks:
        return NO_ANSWER_TEXT, 0.0, False, []

    top_score = ranked_chunks[0]["relevance_score"]

    # Check confidence threshold SLA
    if top_score < confidence_threshold:
        return NO_ANSWER_TEXT, top_score, False, []

    citations = format_citations(ranked_chunks)

    # Format context blocks for LLMs
    context_blocks = []
    for item in ranked_chunks[:3]:
        doc = item["doc"]
        chunk = item["chunk"]
        context_blocks.append(
            f"--- Document: {doc.title} (Version: {doc.version}, Vendor: {doc.vendor})\n"
            f"--- Section: {chunk.section_ref}\n"
            f"Content:\n{chunk.content_text}"
        )

    # Try managed LLM APIs if configured (Claude / OpenAI)
    llm_answer = call_anthropic_llm(query_text, context_blocks)
    if not llm_answer:
        llm_answer = call_openai_llm(query_text, context_blocks)

    if not llm_answer:
        llm_answer = synthesize_grounded_answer(query_text, ranked_chunks)

    return llm_answer, top_score, True, citations
