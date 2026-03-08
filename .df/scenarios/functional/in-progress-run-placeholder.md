---
name: in-progress-run-placeholder
type: functional
spec_id: run_01KK7SEJD8Z1CHN7Z2B1ZDT9P9
created_by: agt_01KK7SEJD9V7MRX6KC86N28S5K
---

PRECONDITIONS: A run exists with status 'running' (not yet completed).

STEPS:
1. Open the dashboard and navigate to this run's detail view.
2. Click the Output tab.
3. Verify a placeholder message is displayed: 'Build in progress. Output will appear when complete.'
4. Verify no gallery, highlights, or module summaries are shown.
5. Verify no JavaScript errors.

EXPECTED:
- Placeholder message shown for in-progress runs.
- No attempt to load/render output data.

PASS CRITERIA:
- Output tab shows exactly the placeholder text from the spec.
- No API errors or JS console errors.
- Tab is still clickable and responsive.