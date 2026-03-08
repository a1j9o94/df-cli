---
name: html-export-embedded-screenshots
type: functional
spec_id: run_01KK7R4Y1NWJRH426C68FK58CZ
created_by: agt_01KK7R4Y1TEX0SQCM76106T1F2
---

Preconditions: A completed visual run with 3+ screenshots in .df/runs/<run-id>/screenshots/ and a valid manifest.json.

Steps:
1. Run: dark run output <run-id> --export --format html
2. Verify output says HTML file was written and prints path
3. Verify .df/runs/<run-id>/output.html exists
4. Read the HTML file and verify:
   - It is a standalone HTML document (has <html>, <head>, <body> tags)
   - Screenshots are embedded as base64 data URIs (src='data:image/png;base64,...')
   - No external file references for images
   - Module summaries are present
   - Scenario results are present
   - CSS is inline (no external stylesheet references)
5. Open the HTML file in a browser (or verify HTML is syntactically valid)

Pass criteria:
- HTML file is self-contained (no external dependencies)
- Screenshots are base64-encoded inline
- File renders in a browser without broken images
- Contains module summaries and scenario results
- Valid HTML structure

Fail criteria:
- HTML file references external screenshot files
- Base64 encoding is broken or missing
- HTML is malformed or doesn't render
- File missing module summaries or scenarios
- External CSS/JS dependencies required