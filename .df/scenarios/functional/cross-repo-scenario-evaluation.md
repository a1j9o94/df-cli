---
name: cross-repo-scenario-evaluation
type: functional
spec_id: run_01KK7SEAH0J838RH3SWCBR48SQ
created_by: agt_01KK7SEAH1RRSGYDNFYKMRG751
---

## Test: Cross-repo Scenario Evaluation

### Preconditions
- Workspace with backend/ and frontend/ projects, both initialized
- A workspace spec has been built successfully (backend API + frontend component)
- A holdout scenario exists declaring projects: [backend, frontend]
- The scenario describes: start backend server, verify frontend can call it

### Steps
1. Run the evaluator phase on the workspace spec
2. The evaluator reads the scenario with projects: [backend, frontend]
3. Verify the evaluator agent receives access to both project directories
4. Verify the evaluator can read files from both backend/ and frontend/

### Expected Output
- Evaluator agent's working context includes paths to both projects
- Evaluator can execute tests that reference files in both repos
- Scenario results are stored in .df-workspace/state.db (not individual project DBs)

### Pass/Fail
- PASS: Evaluator accesses both project directories and can execute cross-project validation
- FAIL: Evaluator only sees one project, or scenario results stored in wrong DB