---
name: builder-receives-attachments
type: functional
spec_id: run_01KJT1F6EV2A1H0TKH6N55D515
created_by: agt_01KJT1F6EWZQATERS37B1QJ6TS
---

## Scenario: Builder receives attachments in worktree

### Preconditions
- A Dark Factory project is initialized
- A spec exists with at least one PNG attachment (attached via dark spec attach)
- A buildplan exists that references the spec

### Steps
1. Create a spec and attach a PNG mockup to it
2. Run a build (dark build <spec-id>) or simulate builder spawning
3. Inspect the builder's mail body (via dark mail check or DB query)
4. Verify the mail body includes the attachment path (either .df/specs/attachments/<spec-id>/filename.png or .df-attachments/filename.png for worktree builders)
5. For worktree-isolated builders: verify that .df-attachments/ directory exists in the worktree
6. Verify .df-attachments/<filename>.png is a readable copy of the original attachment
7. Verify the builder prompt mentions reading image files for visual context

### Expected Output
- Builder mail body contains a section about attachments
- Attachment paths in the mail are valid and point to readable files
- For worktree builders: .df-attachments/ directory contains copies of all spec attachments
- Attachments are read-only copies (content matches original)

### Pass/Fail Criteria
- PASS: Builder can access attachment files from its working directory, mail references them
- FAIL: Attachments missing from worktree, mail has no attachment references, or files are unreadable