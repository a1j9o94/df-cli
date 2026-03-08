---
name: attach-mockup-to-spec
type: functional
spec_id: run_01KK7SEAJYN7NS72QQARJ3QEKA
created_by: agt_01KK7SEAJZB0HYJMAJBXMD3R8E
---

## Test: Attach mockup to spec

### Setup
1. Initialize a Dark Factory project: dark init
2. Create a spec: dark spec create 'Test visual spec'
3. Create a test PNG file: dd if=/dev/urandom bs=1024 count=5 | base64 > /tmp/test-mockup.png (or use a real small PNG)

### Steps
1. Run: dark spec attach <spec-id> /tmp/test-mockup.png
2. Verify file exists at .df/specs/attachments/<spec-id>/test-mockup.png
3. Read the spec markdown file and verify frontmatter now contains: attachments: ['test-mockup.png']
4. Run: dark spec attachments <spec-id>
5. Verify output lists test-mockup.png with its file size

### Expected Output
- File copied to .df/specs/attachments/<spec-id>/test-mockup.png
- Spec frontmatter updated with attachments array
- dark spec attachments <spec-id> shows the file with size info
- Exit code 0 for all commands

### Pass/Fail Criteria
- PASS: File exists in attachments dir, frontmatter updated, list command works
- FAIL: File not copied, frontmatter not updated, or command errors