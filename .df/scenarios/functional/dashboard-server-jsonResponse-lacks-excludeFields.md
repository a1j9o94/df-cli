---
name: dashboard-server-jsonResponse-lacks-excludeFields
type: functional
spec_id: run_01KJQEP7BHVFD7GS7YYJDWFWJH
created_by: agt_01KJQJ7XZCRE2KVMTVPN3DZXT6
---

SCENARIO: Dashboard server's jsonResponse() function uses raw JSON.stringify(data) with no field exclusion. While the dashboard currently constructs a separate AgentSummary type that excludes system_prompt, any new endpoint that passes raw agent records would leak system_prompt. The dashboard should use formatJson with excludeFields for consistency. STEPS: 1. Read src/dashboard/server.ts line 98-99: jsonResponse uses JSON.stringify(data). 2. Verify no import of formatJson from utils/format.ts in server.ts. 3. If a new endpoint returns raw agent records (SELECT * FROM agents), system_prompt would be included. PASS: Dashboard uses formatJson with excludeFields for agent data. FAIL (expected): Dashboard uses raw JSON.stringify.