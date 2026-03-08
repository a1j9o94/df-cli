---
name: builder-reads-video-research
type: functional
spec_id: run_01KK7SEAMQH4864S3Q22NACE6H
created_by: agt_01KK7SEAMS9TJ2REHZD0ZZYG49
---

## Scenario: Builder reads video research tagged to a module

### Preconditions
- A Dark Factory project is initialized
- An architect agent has already extracted video research tagged to module "auth-module"
- A builder agent exists for the same run

### Steps
1. Create a run and architect agent
2. Run: dark research video <architect-id> <url> --module auth-module
3. Verify artifact created with module_id = "auth-module"
4. Run: dark research list --run-id <run-id> --module auth-module
5. Verify the video research artifact appears in the filtered list
6. Run: dark research show <artifact-id>
7. Verify full content is accessible (transcript or Q&A answer)
8. Run: dark research list --run-id <run-id> --module other-module
9. Verify the video research artifact does NOT appear when filtering by a different module

### Pass/Fail Criteria
- PASS: Video research is accessible via module-filtered research list, not visible under other module filters
- FAIL: Research not tagged to module, visible under wrong module, or not accessible to builder