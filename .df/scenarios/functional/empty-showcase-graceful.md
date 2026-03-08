---
name: empty-showcase-graceful
type: functional
spec_id: run_01KK7R4Y1NWJRH426C68FK58CZ
created_by: agt_01KK7R4Y1TEX0SQCM76106T1F2
---

Preconditions: A completed run exists where no screenshots were captured (non-visual spec, or Playwright unavailable) and agent logs contain no highlight-worthy events (no lines matching Decision:, Tradeoff:, Architecture:, etc.).

Steps:
1. Verify .df/runs/<run-id>/screenshots/ does not exist or is empty
2. Verify .df/runs/<run-id>/highlights.json is empty array [] or does not exist
3. Load dashboard and navigate to run detail view
4. Click the 'Output' tab
5. Verify the tab renders without errors (no blank screen, no JS errors)
6. Verify a clean empty state message is shown, e.g., 'No output captured for this run.'
7. Verify there is a hint about how screenshots are captured (mentioning visual specs or Playwright)
8. Verify module summary cards still appear (from DB data, not from highlights)

Pass criteria:
- Output tab renders cleanly with empty state message
- No broken images, empty galleries, or error states
- Hint text explains screenshot capture mechanism
- Module summaries still shown even without highlights
- No JavaScript console errors

Fail criteria:
- Output tab shows empty gallery grid with no images
- Tab shows loading spinner forever
- Error message or stack trace displayed
- Tab content is completely blank