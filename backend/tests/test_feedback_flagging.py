def test_feedback_rating_and_flagging(client):
    # 1. Execute a query to get an answer_id
    login_resp = client.post("/api/v1/auth/login", json={"email": "alex.chen@company.internal"})
    eng_token = login_resp.json()["access_token"]

    q_resp = client.post(
        "/api/v1/query",
        json={"query_text": "Cisco core switch interface flap failover"},
        headers={"Authorization": f"Bearer {eng_token}"}
    )
    assert q_resp.status_code == 200
    answer_id = q_resp.json()["answer_id"]

    # 2. Submit helpful rating
    fb_resp = client.post(
        "/api/v1/feedback",
        json={"answer_id": answer_id, "rating": 1},
        headers={"Authorization": f"Bearer {eng_token}"}
    )
    assert fb_resp.status_code == 201
    assert fb_resp.json()["rating"] == 1

    # 3. Flag an answer with a concern
    flag_resp = client.post(
        "/api/v1/feedback",
        json={
            "answer_id": answer_id,
            "rating": -1,
            "flagged": True,
            "flag_reason": "outdated runbook",
            "flag_details": "Switch command syntax requires updated Nexus NX-OS 9.3 parameter"
        },
        headers={"Authorization": f"Bearer {eng_token}"}
    )
    assert flag_resp.status_code == 201
    flag_data = flag_resp.json()
    assert flag_data["flagged"] is True
    assert flag_data["flag_status"] == "pending"
    feedback_id = flag_data["feedback_id"]

    # 4. SME views flagged answers queue
    sme_login = client.post("/api/v1/auth/login", json={"email": "sarah.sme@company.internal"})
    sme_token = sme_login.json()["access_token"]

    flagged_list = client.get(
        "/api/v1/feedback/flagged?status_filter=pending",
        headers={"Authorization": f"Bearer {sme_token}"}
    )
    assert flagged_list.status_code == 200
    flagged_ids = [f["feedback_id"] for f in flagged_list.json()]
    assert feedback_id in flagged_ids

    # 5. SME reviews and resolves the flag
    review_resp = client.post(
        f"/api/v1/feedback/{feedback_id}/review",
        json={
            "flag_status": "resolved",
            "resolution_action": "doc_updated",
            "reviewer_notes": "Updated command reference to reflect NX-OS 9.3 specification."
        },
        headers={"Authorization": f"Bearer {sme_token}"}
    )
    assert review_resp.status_code == 200
    assert review_resp.json()["flag_status"] == "resolved"
