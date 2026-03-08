---
name: cli-export-html-with-screenshots
type: functional
spec_id: run_01KK7SEJD8Z1CHN7Z2B1ZDT9P9
created_by: agt_01KK7SEJD9V7MRX6KC86N28S5K
---

PRECONDITIONS: A completed visual run exists with run-id 'visual-run-456'. The run has 3 screenshots stored in .df/runs/visual-run-456/screenshots/.

STEPS:
1. Run: dark run output visual-run-456 --export --format html
2. Verify an HTML file is written to .df/runs/visual-run-456/output.html
3. Verify the command prints the file path to stdout.
4. Read the HTML file and verify:
   a. It is a self-contained HTML document (has <html>, <head>, <body> tags).
   b. Screenshots are embedded as base64-encoded data URIs (src='data:image/png;base64,...').
   c. No external file references for images.
   d. Module summaries and scenario results are included.
   e. The file renders correctly when opened in a browser (valid HTML structure).

EXPECTED:
- Self-contained HTML file with base64-embedded screenshots.
- No external dependencies or broken image links.

PASS CRITERIA:
- HTML file exists at expected path.
- File contains at least 3 base64-encoded image data URIs.
- HTML is valid (proper tags, no unclosed elements).
- All module and scenario data present.