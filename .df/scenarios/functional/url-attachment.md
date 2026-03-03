---
name: url-attachment
type: functional
spec_id: run_01KJT1F6EV2A1H0TKH6N55D515
created_by: agt_01KJT1F6EWZQATERS37B1QJ6TS
---

## Scenario: Attach file from URL

### Preconditions
- A Dark Factory project is initialized
- A spec exists
- Network access is available (or a local HTTP server serving a test image)

### Steps
1. Create a spec
2. Run: dark spec attach <spec-id> --url https://via.placeholder.com/100x100.png
   (or any reliable URL serving a PNG file)
3. Verify the command downloads the file
4. Verify the file is stored in .df/specs/attachments/<spec-id>/<downloaded-filename>.png
5. Verify spec frontmatter is updated with the downloaded filename
6. Run: dark spec attachments <spec-id>
7. Verify the downloaded file appears in the listing with correct size

### Expected Output
- File downloaded from URL to .df/specs/attachments/<spec-id>/
- Filename derived from URL path or Content-Disposition header
- Spec frontmatter updated with new attachment entry
- File is valid (not 0 bytes, matches expected format)

### Pass/Fail Criteria
- PASS: URL download succeeds, file stored, frontmatter updated
- FAIL: Download fails silently, file missing or 0 bytes, frontmatter not updated

### Edge Cases
- Invalid URL: should produce clear error message
- URL returns non-image content type: should still save if extension is in allowed list
- URL returns 404: should produce clear error message