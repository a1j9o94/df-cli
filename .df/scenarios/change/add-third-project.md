---
name: add-third-project
type: change
spec_id: run_01KJT1F6D5K21YTBJJ2QG4QY7E
created_by: agt_01KJT1F6D7F50TK3PWRMAKQHN9
---

# Changeability: Add a Third Project to Workspace

## Modification Description
Add a shared/ library project as a third member of an existing workspace that already has frontend/ and backend/.

## Steps Required
1. Create shared/ directory as a git repo, run dark init inside it
2. Edit .df-workspace/config.yaml to add:
   projects:
     - name: backend
       path: ./backend
       role: api-provider
     - name: frontend
       path: ./frontend
       role: api-consumer
     - name: shared
       path: ./shared
       role: library
3. No other files need to change

## Affected Areas
- .df-workspace/config.yaml (1 file, ~3 lines added)
- shared/.df/ (created by dark init, standard process)
- No changes to workspace engine code
- No changes to dashboard code
- No changes to build pipeline code
- No schema migrations needed

## Expected Effort
- 2 minutes: edit config.yaml, run dark init in shared/
- 0 code changes to df-cli itself
- The workspace engine dynamically reads config.yaml, so adding a project is purely configuration

## Pass Criteria
- After adding shared/ to config.yaml:
  - dark workspace init is NOT required again
  - dark dash at workspace level shows 3 projects in the grid
  - dark build on a workspace spec can target modules to shared/
  - Scenarios can reference projects: [backend, frontend, shared]
- No TypeScript changes, no database migrations, no build required
- This verifies the workspace is data-driven (config.yaml), not hard-coded