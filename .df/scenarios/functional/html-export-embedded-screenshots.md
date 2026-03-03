---
name: html-export-embedded-screenshots
type: functional
spec_id: run_01KJSYMVTRZA22SC742GEMEWDJ
created_by: agt_01KJSYMVTT7H090YHJERTJN6FG
---

## HTML Export with Embedded Screenshots

### Preconditions
- A completed visual run with at least 2 screenshots
- Screenshots exist as PNG files on disk
- highlights.json and manifest.json both exist

### Test Steps
1. Run: dark run output <run-id> --export --format html
2. Verify a file is created at .df/runs/<run-id>/output.html
3. Verify the file path is printed to stdout
4. Read the HTML file
5. Verify it starts with DOCTYPE html and is valid HTML
6. Verify screenshots are embedded as base64 data URIs (img src data:image/png;base64)
7. Verify the HTML includes module summaries with file lists and test counts
8. Verify the HTML includes curated highlights
9. Verify it renders without external dependencies (fully self-contained)

### Pass Criteria
- HTML file created at correct path
- All img tags use data: URIs (no external src)
- File size > 0 and contains expected sections
- No external CSS/JS references (fully inline)
- HTML has html, head, body tags