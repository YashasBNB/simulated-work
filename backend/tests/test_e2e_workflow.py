import io
import time

def test_full_incident_and_runbook_lifecycle(client):
    # Step 1: L1 Support Engineer logs in
    login_resp = client.post("/api/v1/auth/login", json={"email": "alex.chen@company.internal"})
    assert login_resp.status_code == 200
    l1_token = login_resp.json()["access_token"]
    headers_l1 = {"Authorization": f"Bearer {l1_token}"}

    # Step 2: Live incident occurs - L1 queries error code 'CrashLoopBackOff'
    start = time.time()
    query_resp = client.post(
        "/api/v1/query",
        json={"query_text": "Production service in CrashLoopBackOff after config push"},
        headers=headers_l1
    )
    duration = time.time() - start
    assert duration < 5.0  # SLA requirement P95 <= 5s
    assert query_resp.status_code == 200
    q_data = query_resp.json()
    assert q_data["is_confident"] is True
    assert len(q_data["citations"]) > 0
    assert q_data["citations"][0]["version"] != ""
    assert "Section" in q_data["citations"][0]["section_ref"]
    answer_id = q_data["answer_id"]

    # Step 3: Engineer rates answer as helpful
    rate_resp = client.post(
        "/api/v1/feedback",
        json={"answer_id": answer_id, "rating": 1},
        headers=headers_l1
    )
    assert rate_resp.status_code == 201

    # Step 4: Content Admin uploads new Oracle DB incident runbook
    admin_login = client.post("/api/v1/auth/login", json={"email": "marcus.admin@company.internal"})
    admin_token = admin_login.json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    oracle_runbook = b"""# Oracle Database Authentication & Lockout Runbook
## Section 1: Resolving ORA-01017 Invalid Credentials
Error Code: ORA-01017
When applications report ORA-01017: invalid username/password; logon denied:
Step 1: Check account lock status in DBA_USERS:
$ psql -U oracle -c "SELECT username, account_status, lock_date FROM dba_users WHERE username='APP_SVC';"
Step 2: Unlock user account if locked due to failed login attempts:
$ ALTER USER app_svc ACCOUNT UNLOCK;
Step 3: Reset password from AWS Secrets Manager vault reference.
"""
    files = {
        "file": ("oracle_ora01017_guide.md", io.BytesIO(oracle_runbook), "text/markdown")
    }
    upload_resp = client.post(
        "/api/v1/documents/upload",
        headers=headers_admin,
        files=files,
        data={
            "title": "Oracle DB ORA-01017 Authentication Troubleshooting Guide",
            "category_id": "database_pg",
            "vendor": "Oracle",
            "version": "1.0.0"
        }
    )
    assert upload_resp.status_code == 201
    oracle_doc_id = upload_resp.json()["doc_id"]

    # Step 5: L1 Engineer queries the newly indexed error code
    ora_query = client.post(
        "/api/v1/query",
        json={"query_text": "Application failing with ORA-01017 logon denied"},
        headers=headers_l1
    )
    assert ora_query.status_code == 200
    ora_data = ora_query.json()
    assert ora_data["is_confident"] is True
    assert any("ORA-01017" in c["title"] or "ORA-01017" in c["section_ref"] for c in ora_data["citations"])

    # Step 6: NOC Lead monitors MTTR and Documentation Gaps
    noc_login = client.post("/api/v1/auth/login", json={"email": "elena.noc@company.internal"})
    noc_token = noc_login.json()["access_token"]
    headers_noc = {"Authorization": f"Bearer {noc_token}"}

    metrics_resp = client.get("/api/v1/analytics/overview", headers=headers_noc)
    assert metrics_resp.status_code == 200
    metrics = metrics_resp.json()
    assert metrics["performance"]["total_queries"] >= 2
    assert metrics["performance"]["estimated_mttr_saved_minutes"] > 0
    assert metrics["document_stats"]["total_documents"] >= 5

    # Step 7: Content Admin deprecates old document and verifies search exclusion
    deprecate_resp = client.post(
        f"/api/v1/documents/{oracle_doc_id}/deprecate",
        json={"reason": "Superceded by Enterprise SSO migration"},
        headers=headers_admin
    )
    assert deprecate_resp.status_code == 200
    assert deprecate_resp.json()["status"] == "deprecated"
