---
name: add-blocker-auto-resolution
type: change
spec_id: run_01KK74N40R4GGRR0DNE5AA8G2A
created_by: agt_01KK74N40TBWEKCQG4G9ZT1SPW
---

MODIFICATION: Add an auto-resolution system where common blockers (e.g., 'needs npm install', 'needs bun install') are automatically resolved without human intervention. EXPECTED APPROACH: Add a resolver registry (map of pattern -> resolver function) that is checked when a blocker is created. If a resolver matches, it executes and auto-resolves the blocker. AFFECTED AREAS: Only the blocker creation flow (dark agent request command handler). The resolve flow, resume logic, dashboard, and notification system should NOT need changes. EFFORT: Should require adding ~1 new file (resolver registry) and ~10-20 lines in the request command handler to check the registry before marking as pending. PASS CRITERIA: Adding a new auto-resolver requires only registering a function in the registry — no changes to the blocker/resume/notification flow.