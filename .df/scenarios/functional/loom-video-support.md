---
name: loom-video-support
type: functional
spec_id: run_01KK7SEAMQH4864S3Q22NACE6H
created_by: agt_01KK7SEAMS9TJ2REHZD0ZZYG49
---

## Scenario: Loom video support

### Preconditions
- A Dark Factory project is initialized
- An architect agent exists with a valid run_id
- llm-youtube CLI is available in PATH and supports Loom URLs

### Steps
1. Create an architect agent for a run
2. Run: dark research video <agent-id> https://www.loom.com/share/abc123def456
3. Verify command passes the Loom URL to llm-youtube without modification (no URL validation/filtering)
4. If llm-youtube succeeds: verify artifact created with source URL = the Loom URL
5. If llm-youtube fails (e.g., network error): verify error is propagated cleanly with descriptive message

### Pass/Fail Criteria
- PASS: Loom URL is accepted and passed through to llm-youtube. No URL validation rejects it. Artifact is created if llm-youtube succeeds.
- FAIL: Command rejects Loom URL, transforms it, or fails to pass it through to llm-youtube