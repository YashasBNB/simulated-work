def test_error_code_search_crashloop(client):
    # Support engineer queries error code
    login_resp = client.post("/api/v1/auth/login", json={"email": "alex.chen@company.internal"})
    token = login_resp.json()["access_token"]

    payload = {"query_text": "How do I fix CrashLoopBackOff?"}
    response = client.post("/api/v1/query", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()

    assert data["is_confident"] is True
    assert data["query_type"] == "error_code"
    assert "CRASHLOOPBACKOFF" in [c.upper() for c in data["detected_error_codes"]]
    assert len(data["citations"]) > 0

    # Acceptance criteria: 100% of answers show document, section, version
    top_citation = data["citations"][0]
    assert "CrashLoopBackOff" in top_citation["title"] or "Kubernetes" in top_citation["title"]
    assert "Section" in top_citation["section_ref"]
    assert top_citation["version"] != ""
    assert data["latency_ms"] < 5000  # P95 <= 5s SLA

def test_natural_language_query_504_gateway_timeout(client):
    login_resp = client.post("/api/v1/auth/login", json={"email": "alex.chen@company.internal"})
    token = login_resp.json()["access_token"]

    payload = {"query_text": "Ingress returning 504 gateway timeout to end users"}
    response = client.post("/api/v1/query", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()

    assert data["is_confident"] is True
    assert len(data["citations"]) > 0
    top_citation = data["citations"][0]
    assert "504" in top_citation["title"] or "Nginx" in top_citation["title"]
    assert "Section 3.1" in top_citation["section_ref"]

def test_deprecation_exclusion(client):
    # Search for legacy Apache runbook (which is status='deprecated')
    login_resp = client.post("/api/v1/auth/login", json={"email": "alex.chen@company.internal"})
    token = login_resp.json()["access_token"]

    payload = {"query_text": "Legacy Apache MaxClients tuning"}
    response = client.post("/api/v1/query", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()

    # The deprecated document should NOT be cited
    cited_titles = [c["title"] for c in data["citations"]]
    assert not any("Legacy Apache" in t for t in cited_titles)

def test_no_confident_answer_for_unrelated_query(client):
    login_resp = client.post("/api/v1/auth/login", json={"email": "alex.chen@company.internal"})
    token = login_resp.json()["access_token"]

    payload = {"query_text": "What is the recipe for chocolate chip cookies with walnuts?"}
    response = client.post("/api/v1/query", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()

    # Acceptance criteria: 100% of answers show document, section, version — or 'no confident answer'
    assert data["is_confident"] is False
    assert "No confident answer found" in data["response_text"]
    assert len(data["citations"]) == 0
