---
name: builder-receives-attachments
type: functional
spec_id: run_01KK7SEAJYN7NS72QQARJ3QEKA
created_by: agt_01KK7SEAJZB0HYJMAJBXMD3R8E
---

## Test: Builder receives attachment paths in instructions

### Setup
1. Initialize Dark Factory project
2. Create spec with title 'Build a landing page'
3. Attach a PNG mockup to the spec: dark spec attach <spec-id> mockup.png
4. Attach a design tokens JSON: dark spec attach <spec-id> tokens.json

### Steps
1. Trigger a build: dark build <spec-id>
2. Wait for architect phase to complete
3. When builder agent is spawned, check the mail sent to the builder (via DB or dark mail check)
4. Verify the builder's mail body includes paths to the attached mockup and tokens files
5. For worktree-isolated builders: verify attachments are copied to <worktree>/.df-attachments/ directory
6. Verify the builder can read the attachment files from its worktree path

### Expected Output
- Builder instructions include attachment paths in the mail body
- For worktree builders: .df-attachments/ directory exists in worktree with copies of mockup.png and tokens.json
- Files are readable by the builder agent

### Pass/Fail Criteria
- PASS: Builder mail includes attachment references, files accessible in worktree
- FAIL: Builder mail missing attachment info, files not accessible, or .df-attachments/ not created