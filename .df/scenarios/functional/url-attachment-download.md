---
name: url-attachment-download
type: functional
spec_id: run_01KK7SEAJYN7NS72QQARJ3QEKA
created_by: agt_01KK7SEAJZB0HYJMAJBXMD3R8E
---

## Test: Attach file from URL

### Setup
1. Initialize Dark Factory project
2. Create a spec: dark spec create 'URL attachment test'
3. Have a publicly accessible image URL (e.g., https://via.placeholder.com/150.png or similar)

### Steps
1. Run: dark spec attach <spec-id> --url https://via.placeholder.com/150.png
2. Verify the file is downloaded and saved to .df/specs/attachments/<spec-id>/150.png
3. Verify spec frontmatter is updated with attachments: ['150.png']
4. Run: dark spec attachments <spec-id>
5. Verify the downloaded file is listed with correct size

### Expected Output
- File downloaded from URL and saved in attachments directory
- Filename derived from URL path (150.png)
- Frontmatter updated
- File accessible via attachments list command

### Pass/Fail Criteria
- PASS: File downloaded, saved correctly, frontmatter updated, listed in attachments
- FAIL: Download fails, file not saved, frontmatter not updated, or missing from list