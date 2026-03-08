---
name: empty-output-graceful
type: functional
spec_id: run_01KK7SEJD8Z1CHN7Z2B1ZDT9P9
created_by: agt_01KK7SEJD9V7MRX6KC86N28S5K
---

PRECONDITIONS: A completed run exists where no screenshots were captured (non-visual spec or Playwright unavailable) and agent logs contain no highlight-worthy events (no Decision:, Tradeoff:, Architecture: patterns).

STEPS:
1. Open the dashboard and navigate to this run's detail view.
2. Click the Output tab.
3. Verify the tab does NOT show an empty/broken view.
4. Verify a clean message is displayed: 'No output captured for this run.' with a hint about how screenshots are captured.
5. Verify no JavaScript errors in the browser console.
6. Verify the tab still shows the module summary section (even without highlights, module data from buildplan should display).

EXPECTED:
- Clean empty state message, not broken UI.
- Hint text about screenshot capture present.
- No JS errors.

PASS CRITERIA:
- Output tab renders without errors.
- Empty state message matches spec text.
- Module summary section still renders with basic module info (name, description, files).