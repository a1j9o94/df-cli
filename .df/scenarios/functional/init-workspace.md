---
name: init-workspace
type: functional
spec_id: run_01KJT1F6D5K21YTBJJ2QG4QY7E
created_by: agt_01KJT1F6D7F50TK3PWRMAKQHN9
---

# Init Workspace

## Preconditions
- A directory exists at /tmp/test-workspace/ with two subdirectories:
  - /tmp/test-workspace/frontend/ — an initialized git repo (git init + initial commit)
  - /tmp/test-workspace/backend/ — an initialized git repo (git init + initial commit)
- Neither subdirectory has a .df/ directory
- No .df-workspace/ exists in /tmp/test-workspace/

## Steps
1. cd /tmp/test-workspace/
2. Run: dark workspace init
3. Inspect the created directory structure

## Expected Output
1. .df-workspace/ directory is created at /tmp/test-workspace/.df-workspace/
2. .df-workspace/config.yaml exists and contains:
   - A 'projects' array with entries for both 'frontend' and 'backend'
   - Each entry has: name (string), path (relative like ./frontend), role (string)
3. .df-workspace/specs/ directory exists (empty)
4. .df-workspace/scenarios/ directory exists (empty)
5. .df-workspace/state.db exists and is a valid SQLite database
6. The frontend/.df/ and backend/.df/ directories are NOT created (individual projects init separately)
7. ~/.dark/registry.yaml is updated with an entry of type 'workspace' pointing to /tmp/test-workspace/

## Pass Criteria
- All 7 expected outputs verified
- dark workspace init exits with code 0
- Running dark workspace init again in the same directory shows an error (already initialized)