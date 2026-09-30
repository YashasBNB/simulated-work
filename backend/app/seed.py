import uuid
from sqlalchemy.orm import Session
from app.models.user import Role, User
from app.models.document import Category, Document, DocumentChunk
from app.services.ingestion import extract_error_codes, extract_keywords, compute_dense_embedding

def seed_database(db: Session):
    """Populate default roles, users, categories, and mission-critical incident runbooks."""
    # 1. Seed Roles
    existing_roles = {r.role_id: r for r in db.query(Role).all()}
    
    roles_data = [
        {
            "role_id": "support_l1",
            "role_name": "Support Engineer (L1)",
            "description": "Front-line incident support; queries authorized runbooks during live outages.",
            "permitted_categories": ["k8s_infra", "network_cisco", "database_pg", "web_gateway"]
        },
        {
            "role_id": "sme_senior",
            "role_name": "Senior/SME Engineer",
            "description": "Reviews flagged answers, handles deep escalations, updates runbooks.",
            "permitted_categories": ["*"]
        },
        {
            "role_id": "content_admin",
            "role_name": "Content Admin",
            "description": "Uploads, categorizes, versions, and deprecates incident runbooks.",
            "permitted_categories": ["*"]
        },
        {
            "role_id": "noc_lead",
            "role_name": "NOC / Team Lead",
            "description": "Monitors outage SLAs, MTTR reduction, documentation gaps, and query volume.",
            "permitted_categories": ["*"]
        },
        {
            "role_id": "system_admin",
            "role_name": "System Admin",
            "description": "Full access to platform administration, RBAC, users, and audit logs.",
            "permitted_categories": ["*"]
        }
    ]

    for rd in roles_data:
        if rd["role_id"] not in existing_roles:
            role = Role(**rd)
            db.add(role)
    db.commit()

    # 2. Seed Users
    existing_users = {u.email: u for u in db.query(User).all()}
    users_data = [
        {"user_id": "usr_l1_eng", "name": "Alex Chen", "email": "alex.chen@company.internal", "role_id": "support_l1"},
        {"user_id": "usr_sme_senior", "name": "Sarah Miller (SME)", "email": "sarah.sme@company.internal", "role_id": "sme_senior"},
        {"user_id": "usr_content_adm", "name": "Marcus Vance", "email": "marcus.admin@company.internal", "role_id": "content_admin"},
        {"user_id": "usr_noc_lead", "name": "Elena Rostova", "email": "elena.noc@company.internal", "role_id": "noc_lead"},
        {"user_id": "usr_sysadmin", "name": "DevOps Admin", "email": "admin@company.internal", "role_id": "system_admin"}
    ]

    for ud in users_data:
        if ud["email"] not in existing_users:
            user = User(**ud)
            db.add(user)
    db.commit()

    # 3. Seed Categories
    existing_categories = {c.category_id: c for c in db.query(Category).all()}
    categories_data = [
        {"category_id": "k8s_infra", "name": "Kubernetes & Cloud Infrastructure", "vendor": "Kubernetes / CNCF", "description": "Pod lifecycle, node stability, ingress controllers, resource quotas."},
        {"category_id": "web_gateway", "name": "Edge Gateways & Load Balancers", "vendor": "Nginx / Envoy / AWS", "description": "Reverse proxies, timeouts, TLS terminations, HTTP gateway errors."},
        {"category_id": "network_cisco", "name": "Core Networking & Switches", "vendor": "Cisco Systems", "description": "BGP, VLAN, interface flap, spanning-tree protocol, failover runbooks."},
        {"category_id": "database_pg", "name": "Relational Databases", "vendor": "PostgreSQL / Oracle", "description": "Replica lag, connection pool exhaustion, lock contention, deadlocks."},
        {"category_id": "confidential_internal", "name": "Tier-3 Proprietary Security Protocols", "vendor": "Internal Security", "description": "Restricted secrets management and disaster recovery keys (Admins/SMEs only)."}
    ]

    for cd in categories_data:
        if cd["category_id"] not in existing_categories:
            cat = Category(**cd)
            db.add(cat)
    db.commit()

    # 4. Seed Standard Incident Runbooks with Chunks
    if db.query(Document).count() == 0:
        runbooks = [
            {
                "doc_id": "doc_k8s_crashloop",
                "title": "Kubernetes Pod CrashLoopBackOff Remediation Guide",
                "vendor": "Kubernetes",
                "category_id": "k8s_infra",
                "version": "2.4.0",
                "filename": "k8s_crashloop_runbook.md",
                "chunks": [
                    {
                        "section_ref": "Section 1: Initial Diagnosis and Crash Reason Discovery",
                        "content_text": (
                            "When a pod enters CrashLoopBackOff state, it indicates repeated application container termination immediately after launch.\n"
                            "Error Code: CrashLoopBackOff\n"
                            "Step 1: Check pod events and container termination reason:\n"
                            "$ kubectl describe pod <pod-name> -n <namespace>\n"
                            "Look at 'Last State: Terminated' and 'Exit Code'. Common exit codes include Exit Code 137 (OOMKilled) and Exit Code 1 (Application runtime crash).\n"
                            "Step 2: Inspect the previous crashed container logs:\n"
                            "$ kubectl logs <pod-name> -n <namespace> --previous --tail=100\n"
                            "Step 3: Verify environment variables and Secret references:\n"
                            "$ kubectl get pod <pod-name> -n <namespace> -o yaml | grep -A 10 env"
                        )
                    },
                    {
                        "section_ref": "Section 2: OOMKilled and Memory Limit Exhaustion",
                        "content_text": (
                            "If the container termination reason is OOMKilled (Exit Code 137), the pod exceeded its allocated memory quota.\n"
                            "Error Code: OOMKilled\n"
                            "Step 1: Verify current memory consumption across pods:\n"
                            "$ kubectl top pod -n <namespace> --containers\n"
                            "Step 2: Temporarily patch memory limits in the deployment spec:\n"
                            "$ kubectl set resources deployment <deployment-name> -n <namespace> --limits=memory=2Gi --requests=memory=1Gi\n"
                            "Step 3: Monitor rollout status:\n"
                            "$ kubectl rollout status deployment/<deployment-name> -n <namespace>"
                        )
                    }
                ]
            },
            {
                "doc_id": "doc_nginx_504",
                "title": "Nginx & Ingress HTTP 504 Gateway Timeout Resolution Runbook",
                "vendor": "Nginx / AWS",
                "category_id": "web_gateway",
                "version": "3.1.2",
                "filename": "nginx_504_timeout_guide.md",
                "chunks": [
                    {
                        "section_ref": "Section 3.1: Identifying Upstream Timeout Latency",
                        "content_text": (
                            "An HTTP 504 Gateway Timeout occurs when the edge proxy or ingress fails to receive a timely response from upstream application backends.\n"
                            "Error Code: HTTP 504, 504 Gateway Timeout\n"
                            "Step 1: Tail the Nginx error and access logs for upstream response duration:\n"
                            "$ tail -n 50 /var/log/nginx/error.log | grep upstream\n"
                            "Step 2: Check backend application service health and port connectivity:\n"
                            "$ curl -Iv http://127.0.0.1:8080/health --connect-timeout 5\n"
                            "Step 3: If backend response time requires extended SLA, adjust proxy buffer and timeout in nginx.conf:\n"
                            "proxy_connect_timeout 60s;\n"
                            "proxy_send_timeout 120s;\n"
                            "proxy_read_timeout 120s;\n"
                            "Step 4: Reload Nginx configuration with zero downtime:\n"
                            "$ nginx -t && systemctl reload nginx"
                        )
                    }
                ]
            },
            {
                "doc_id": "doc_pg_replica",
                "title": "PostgreSQL Streaming Replication Lag and Connection Pool Recovery",
                "vendor": "PostgreSQL",
                "category_id": "database_pg",
                "version": "1.8.0",
                "filename": "postgres_replica_lag_recovery.md",
                "chunks": [
                    {
                        "section_ref": "Section 2.4: Diagnosing WAL Replication Lag",
                        "content_text": (
                            "High replication lag causes stale reads and replica failover failure.\n"
                            "Error Code: PGRES_FATAL_ERROR, ERR_REPLICATION_LAG\n"
                            "Step 1: Connect to the primary database and measure replication byte lag:\n"
                            "$ psql -U postgres -c 'SELECT client_addr, state, sync_state, pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes FROM pg_stat_replication;'\n"
                            "Step 2: Check replica disk I/O and CPU bottleneck:\n"
                            "$ iostat -xz 1 5\n"
                            "Step 3: If lag exceeds 1GB, verify network saturation or pause write-heavy batch operations on primary."
                        )
                    },
                    {
                        "section_ref": "Section 4.1: Resolving Connection Pool Exhaustion",
                        "content_text": (
                            "When application servers report 'sorry, too many clients already' or connection timeouts.\n"
                            "Error Code: 53300, ERR_CONN_EXHAUSTED\n"
                            "Step 1: Inspect active connections by state:\n"
                            "$ psql -U postgres -c 'SELECT state, count(*) FROM pg_stat_activity GROUP BY state;'\n"
                            "Step 2: Terminate idle in transaction connections older than 10 minutes:\n"
                            "$ psql -U postgres -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND state_change < now() - INTERVAL '10 minutes';\"\n"
                            "Step 3: Verify PgBouncer connection pool limits and restart pooler if required."
                        )
                    }
                ]
            },
            {
                "doc_id": "doc_cisco_failover",
                "title": "Cisco Catalyst & Nexus Core Switch Link Degradation & Failover",
                "vendor": "Cisco Systems",
                "category_id": "network_cisco",
                "version": "4.0.1",
                "filename": "cisco_core_switch_failover.md",
                "chunks": [
                    {
                        "section_ref": "Section 5: Link Flapping and Interface Error Rate Remediation",
                        "content_text": (
                            "Interface packet drops and cyclic flapping trigger BGP flapping and routing table recalculations.\n"
                            "Error Code: ERR_CONN_TIMEDOUT, %LINK-3-UPDOWN, %LINEPROTO-5-UPDOWN\n"
                            "Step 1: Inspect switch port error counters and CRC errors:\n"
                            "$ show interface status | grep Gi1/0/1\n"
                            "$ show interfaces Gi1/0/1 counters errors\n"
                            "Step 2: Force failover to standby redundant uplink trunk:\n"
                            "$ configure terminal\n"
                            "$ interface Gi1/0/1\n"
                            "$ shutdown\n"
                            "Step 3: Verify spanning-tree rapid convergence and BGP state:\n"
                            "$ show spanning-tree summary\n"
                            "$ show ip bgp summary"
                        )
                    }
                ]
            },
            {
                "doc_id": "doc_deprecated_sample",
                "title": "Legacy Apache Web Server v2.2 Outage Manual (Deprecated)",
                "vendor": "Apache",
                "category_id": "web_gateway",
                "version": "0.9.1",
                "filename": "apache_v22_legacy.md",
                "chunks": [
                    {
                        "section_ref": "Section 1: Legacy Apache MaxClients Tuning",
                        "content_text": (
                            "Deprecated legacy instructions for Apache Prefork MPM MaxClients.\n"
                            "This document is DEPRECATED and must not appear in modern incident queries.\n"
                            "Step 1: Edit httpd.conf and restart httpd service."
                        )
                    }
                ]
            }
        ]

        for rb in runbooks:
            is_deprecated = "deprecated" in rb["doc_id"]
            doc = Document(
                doc_id=rb["doc_id"],
                title=rb["title"],
                vendor=rb["vendor"],
                category_id=rb["category_id"],
                version=rb["version"],
                status="deprecated" if is_deprecated else "active",
                filename=rb["filename"],
                file_path=f"/uploads/{rb['filename']}",
                file_type="md",
                file_size_bytes=1024,
                uploaded_by="usr_content_adm"
            )
            db.add(doc)
            db.flush()

            for idx, chk in enumerate(rb["chunks"]):
                err_codes = extract_error_codes(chk["content_text"])
                keywords = extract_keywords(chk["content_text"])
                embedding = compute_dense_embedding(f"{chk['section_ref']}\n{chk['content_text']}")
                chunk_obj = DocumentChunk(
                    chunk_id=f"chk_{uuid.uuid4().hex[:12]}",
                    doc_id=doc.doc_id,
                    section_ref=chk["section_ref"],
                    content_text=chk["content_text"],
                    embedding_vector=embedding,
                    error_codes=err_codes,
                    keywords=keywords,
                    chunk_index=idx
                )
                db.add(chunk_obj)

        db.commit()
