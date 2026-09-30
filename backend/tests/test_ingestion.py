import io
from app.services.ingestion import extract_error_codes, extract_keywords, compute_dense_embedding

def test_extract_error_codes():
    sample_text = "Server threw HTTP 504 and pod reported CrashLoopBackOff with OOMKilled on node. Database returned ORA-01017 and ERR_CONNECTION_REFUSED."
    codes = extract_error_codes(sample_text)
    assert "504" in codes or "HTTP 504" in codes
    assert "CRASHLOOPBACKOFF" in codes
    assert "OOMKILLED" in codes
    assert "ORA-01017" in codes
    assert "ERR_CONNECTION_REFUSED" in codes

def test_dense_embedding_normalization():
    vec = compute_dense_embedding("Kubernetes deployment pod memory quota error")
    assert len(vec) == 128
    # Test L2 norm is ~1.0
    norm = sum(x * x for x in vec) ** 0.5
    assert abs(norm - 1.0) < 0.01

def test_upload_document_endpoint(client):
    login_resp = client.post("/api/v1/auth/login", json={"email": "marcus.admin@company.internal"})
    token = login_resp.json()["access_token"]

    file_content = b"""# Section 1: Redis Cache Outage Recovery
Error Code: ERR_REDIS_READONLY
When Redis enters read-only mode during memory saturation:
Step 1: Check memory usage via redis-cli info memory
Step 2: Increase maxmemory quota or flush stale session keys
Step 3: Verify replica replication status
$ redis-cli info replication
"""
    files = {
        "file": ("redis_outage_runbook.md", io.BytesIO(file_content), "text/markdown")
    }
    data = {
        "title": "Redis Cache Cluster Outage Guide",
        "category_id": "database_pg",
        "vendor": "Redis",
        "version": "1.0.0"
    }

    response = client.post(
        "/api/v1/documents/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
        data=data
    )
    assert response.status_code == 201
    doc = response.json()
    assert doc["title"] == "Redis Cache Cluster Outage Guide"
    assert len(doc["chunks"]) > 0
    assert doc["status"] == "active"
