---
name: file-size-limit-enforcement
type: functional
spec_id: run_01KK7SEAJYN7NS72QQARJ3QEKA
created_by: agt_01KK7SEAJZB0HYJMAJBXMD3R8E
---

## Test: File size limit enforcement

### Setup
1. Initialize Dark Factory project
2. Create a spec: dark spec create 'Size limit test'
3. Create a file larger than 10MB: dd if=/dev/zero bs=1M count=11 of=/tmp/large-file.png

### Steps
1. Run: dark spec attach <spec-id> /tmp/large-file.png
2. Verify the command rejects the file with an error about exceeding 10MB limit
3. Verify the file is NOT copied to .df/specs/attachments/<spec-id>/
4. Verify frontmatter is NOT updated

### Expected Output
- Error message indicating file exceeds 10MB size limit
- No file copied to attachments directory
- Frontmatter unchanged
- Non-zero exit code

### Pass/Fail Criteria
- PASS: Command rejects oversized file with clear error, no side effects
- FAIL: File accepted despite being over limit, or unclear error message