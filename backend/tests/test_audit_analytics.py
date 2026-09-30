def test_audit_logs_tracking(client):
    admin_login = client.post("/api/v1/auth/login", json={"email": "admin@company.internal"})
    admin_token = admin_login.json()["access_token"]

    response = client.get("/api/v1/audit?limit=20", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    logs = response.json()
    assert len(logs) > 0
    actions = [l["action"] for l in logs]
    assert any("USER_LOGIN" in a or "QUERY_EXECUTED" in a for a in actions)

def test_analytics_dashboard(client):
    noc_login = client.post("/api/v1/auth/login", json={"email": "elena.noc@company.internal"})
    noc_token = noc_login.json()["access_token"]

    response = client.get("/api/v1/analytics/overview", headers={"Authorization": f"Bearer {noc_token}"})
    assert response.status_code == 200
    data = response.json()

    assert "performance" in data
    assert "document_stats" in data
    assert "feedback_summary" in data
    assert "top_error_codes" in data
    assert "documentation_gaps" in data

    # Check metrics structure
    assert data["document_stats"]["active_documents"] >= 4
    assert data["document_stats"]["deprecated_documents"] >= 1
    assert data["performance"]["estimated_mttr_saved_minutes"] >= 0
