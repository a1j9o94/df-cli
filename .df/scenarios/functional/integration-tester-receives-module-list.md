---
name: integration-tester-receives-module-list
type: functional
spec_id: run_01KJP6GK3B3RYANRP51CFYXDF7
created_by: agt_01KJP6GK3CC8RV8Q8WDC17DRVD
---

PRECONDITIONS: A pipeline run with a buildplan containing 3 modules (e.g., module-a, module-b, module-c) has completed the build phase. Three builder agents exist with status=completed and worktree_path set.

STEPS:
1. Inspect the mail message sent to the integration-tester agent (query messages table WHERE to_agent_id = integration-tester-agent AND from_agent_id = orchestrator).
2. Parse the mail body as markdown.
3. Verify the body contains a section listing all 3 modules with:
   - Module ID (e.g., 'module-a')
   - Module title (e.g., 'Authentication Layer')
   - Module description (e.g., 'Handles user login and session management')
4. Verify each module has a corresponding worktree path listed.

EXPECTED OUTPUT:
- The mail body contains ALL module IDs from the buildplan.
- Each module ID appears with its title and description.
- Each completed builder's worktree_path is shown next to the corresponding module.

PASS CRITERIA:
- All 3 module names appear in the mail body.
- Each module has its title AND description included.
- Worktree paths are present for each completed builder.

FAIL CRITERIA:
- Any module is missing from the mail.
- Module entries show only IDs without title/description.
- Worktree paths are absent.