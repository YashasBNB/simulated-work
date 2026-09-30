def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["sla_p95_target_seconds"] == 5.0

def test_list_roles(client):
    response = client.get("/api/v1/auth/roles")
    assert response.status_code == 200
    roles = response.json()
    role_ids = [r["role_id"] for r in roles]
    assert "support_l1" in role_ids
    assert "sme_senior" in role_ids
    assert "content_admin" in role_ids
    assert "noc_lead" in role_ids

def test_user_login_and_token(client):
    response = client.post("/api/v1/auth/login", json={"email": "alex.chen@company.internal"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "alex.chen@company.internal"
    assert data["user"]["role_id"] == "support_l1"

def test_get_current_user_profile(client):
    # Login to get token
    login_resp = client.post("/api/v1/auth/login", json={"email": "sarah.sme@company.internal"})
    token = login_resp.json()["access_token"]

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["name"] == "Sarah Miller (SME)"
    assert user_data["role"]["role_id"] == "sme_senior"
