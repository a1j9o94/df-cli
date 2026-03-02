---
name: expertise-prime-still-uses-raw-JSON-stringify
type: functional
spec_id: run_01KJQEP7BHVFD7GS7YYJDWFWJH
created_by: agt_01KJQJ7XZCRE2KVMTVPN3DZXT6
---

SCENARIO: src/commands/expertise/prime.ts line 58 still uses JSON.stringify directly instead of formatJson. While this writes to a file (not stdout), it violates the spec requirement that ALL JSON output should be audited and consistent. STEPS: 1. grep JSON.stringify src/commands/ — finds expertise/prime.ts:58. 2. Verify this is the only command file still using raw JSON.stringify. PASS: All command files use formatJson exclusively. FAIL: expertise/prime.ts uses raw JSON.stringify.