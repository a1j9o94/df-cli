---
name: init-workspace
type: functional
spec_id: run_01KK7SEAH0J838RH3SWCBR48SQ
created_by: agt_01KK7SEAH1RRSGYDNFYKMRG751
---

## Test: Init Workspace

### Preconditions
- A directory ~/test-workspace/ exists with two subdirectories: frontend/ and backend/
- Each subdirectory is an initialized git repo (git init)
- Neither has .df/ initialized

### Steps
1. cd ~/test-workspace
2. Run: dark workspace init
3. Verify .df-workspace/ directory is created at ~/test-workspace/.df-workspace/
4. Verify .df-workspace/config.yaml exists and contains both projects:
   projects:
     - name: backend
       path: ./backend
     - name: frontend
       path: ./frontend
5. Verify .df-workspace/state.db exists and is a valid SQLite database
6. Verify .df-workspace/specs/ directory exists
7. Verify .df-workspace/scenarios/ directory exists
8. Verify ~/.dark/registry.yaml is updated with an entry for the workspace

### Expected Output
- Command exits 0 with success message listing member projects
- .df-workspace/ structure matches spec requirements
- Registry is updated

### Pass/Fail
- PASS: All verification steps succeed
- FAIL: Any directory, file, or config entry is missing or malformed