---
name: cross-repo-scenario-evaluation
type: functional
spec_id: run_01KJT1F6D5K21YTBJJ2QG4QY7E
created_by: agt_01KJT1F6D7F50TK3PWRMAKQHN9
---

# Cross-repo Scenario Evaluation

## Preconditions
- Workspace with frontend/ and backend/ projects
- A workspace-level scenario file with frontmatter: projects: [backend, frontend]
- Build phase has completed (modules merged into their respective project branches)

## Steps
1. Create a scenario in .df-workspace/scenarios/functional/ with:
   ---
   name: api-integration
   type: functional
   projects: [backend, frontend]
   ---
   Content: Start backend server, verify frontend can call GET /api/users endpoint
2. Run the evaluator phase

## Expected Output
1. Evaluator agent is spawned with access to BOTH project directories
2. The evaluator's working directory or context includes paths to both:
   - The backend project's codebase
   - The frontend project's codebase
3. The evaluator can run commands in both project directories
4. Scenario results include pass/fail for cross-project integration

## Pass Criteria
- Evaluator receives scenario with projects: [backend, frontend] in its instructions
- Evaluator has filesystem access to both project directories
- Evaluation events in state.db reference the cross-repo scenario
- No errors about missing project directories or invalid project references