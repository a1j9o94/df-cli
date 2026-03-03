---
name: attach-mockup-to-spec
type: functional
spec_id: run_01KJT1F6EV2A1H0TKH6N55D515
created_by: agt_01KJT1F6EWZQATERS37B1QJ6TS
---

## Scenario: Attach mockup to spec

### Preconditions
- A Dark Factory project is initialized (dark init)
- A spec exists (created via dark spec create)
- A PNG file exists on disk (e.g., test-mockup.png)

### Steps
1. Create a spec: dark spec create 'Test visual feature'
2. Note the spec ID (e.g., spec_01ABC123)
3. Create a test PNG file (any valid PNG, e.g., a 1x1 pixel PNG)
4. Run: dark spec attach <spec-id> test-mockup.png
5. Verify the file was copied to .df/specs/attachments/<spec-id>/test-mockup.png
6. Read the spec markdown file and verify frontmatter now contains: attachments: ['test-mockup.png']
7. Run: dark spec attachments <spec-id>
8. Verify output shows the filename and file size

### Expected Output
- Exit code 0 for the attach command
- File exists at .df/specs/attachments/<spec-id>/test-mockup.png
- File contents match the original test-mockup.png
- Spec frontmatter has attachments array with 'test-mockup.png'
- dark spec attachments lists the file with its size in bytes

### Pass/Fail Criteria
- PASS: All verifications succeed
- FAIL: Any verification fails (file not copied, frontmatter not updated, list command broken)