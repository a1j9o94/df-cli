---
name: merger-fails-on-conflict-markers
type: functional
spec_id: run_01KJQ3REAY3PPJ95V0NGGPB8WZ
created_by: agt_01KJQ3REAZSCFRXXN0X7HMFP16
---

## Test: Merger fails on conflict markers

### Preconditions
- A Dark Factory project is initialized
- A merger agent exists in the DB with role='merger' and status='running'
- All project tests pass (exit code 0)

### Steps
1. Create a tracked file (e.g., `src/example.ts`) containing merge conflict markers:
   ```
   <<<<<<< HEAD
   const x = 1;
   =======
   const x = 2;
   >>>>>>> branch-name
   ```
2. Stage and commit the file with conflict markers
3. Run `dark agent complete <merger-agent-id>`
4. Capture the exit code and error output

### Expected Output
- Step 3: Command exits with non-zero exit code
- Step 3: Error message clearly states that merge conflict markers were found
- Step 3: Error message identifies the file(s) containing conflict markers
- The merger agent status remains 'running' (NOT 'completed')

### Pass Criteria
- `dark agent complete` rejects when conflict markers exist in tracked files
- Error message specifically mentions conflict markers (<<<<<<< or ======= or >>>>>>>)
- The file path containing markers is included in the error message