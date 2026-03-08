---
name: copy-as-markdown
type: functional
spec_id: run_01KK7SEAF66NVEXSWY52CHEZ2Q
created_by: agt_01KK7SEAF8R2TQCK3AC2E5ZV0E
---

Setup: Have a timeline with at least 1 completed spec, 1 in-progress spec, and 1 planned spec.

Steps:
1. Open the dashboard Timeline tab
2. Click the 'Copy as Markdown' button in the tab header
3. Paste the clipboard content into a plain text editor

Expected:
- Clipboard contains well-formatted markdown
- Format matches the dark timeline digest output structure
- No HTML tags, no CSS classes, no JavaScript artifacts in the pasted content
- Section headers use ## markdown syntax
- Spec entries use bullet points with **bold** titles
- Cost values are formatted with dollar signs and 2 decimal places

Pass criteria: Pasted content is clean markdown suitable for Slack/email/Notion without reformatting.