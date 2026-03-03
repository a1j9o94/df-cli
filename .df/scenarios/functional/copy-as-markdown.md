---
name: copy-as-markdown
type: functional
spec_id: run_01KJSYMVS0W36Y61PR2WNYBM7W
created_by: agt_01KJSYMVS1M06HAVTY6C5FAXR2
---

## Copy as Markdown button in Timeline tab

### Preconditions
- Dashboard running with at least 1 completed spec and 1 in-progress spec
- Timeline tab visible in the dashboard

### Setup Steps
1. Start dashboard: dark dash --no-open
2. Have at least 1 completed run and 1 running run in the database

### Test Steps
1. Load dashboard HTML
2. Verify the Timeline tab panel contains a 'Copy as Markdown' button
3. Verify the button has an onclick handler that generates markdown
4. Verify the generated markdown matches the format of 'dark timeline digest --week'

### Expected Results
- A button with text 'Copy as Markdown' (or similar) exists in the Timeline tab header area
- The button's click handler calls navigator.clipboard.writeText() or a fallback
- The markdown generated contains the same sections as the CLI digest: Completed, In Progress, Planned
- The markdown is clean — no HTML artifacts, no broken formatting, no raw JSON
- The markdown is suitable for pasting into Slack, email, Notion, or Google Docs
- Format should match: headings with ##, bold spec titles, cost and scenario data inline

### Pass/Fail Criteria
- PASS: Button exists, generates well-formatted markdown matching CLI output structure
- FAIL: No button, broken markdown, HTML artifacts in output, or clipboard API not called