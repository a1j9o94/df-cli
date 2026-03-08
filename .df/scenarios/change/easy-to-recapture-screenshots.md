---
name: easy-to-recapture-screenshots
type: change
spec_id: run_01KK7DP798CHYWTWAKHGK0A2C7
created_by: agt_01KK7DP799F4SZXE3CDAY0ZRQP
---

## Change Test: Screenshots can be easily re-captured

### Modification Description
If the dashboard UI changes, a builder agent should be able to re-capture all screenshots without special tooling. This tests that the screenshot capture process is straightforward and reproducible.

### Steps
1. Examine how screenshots were captured (look for scripts, Playwright tests, or documentation)
2. Verify there is either:
   a. A script or Playwright test that can capture all screenshots automatically, OR
   b. Clear documentation in the screenshots section or a separate doc explaining how to recapture
3. If a script exists, verify it can be invoked with a single command (e.g. bun run capture-screenshots)
4. Delete one screenshot from docs/screenshots/
5. Attempt to re-capture it using the documented process
6. Verify the re-captured screenshot matches the expected state

### Affected Areas
- docs/screenshots/ (output directory)
- Any capture script or Playwright test file
- README.md documentation of capture process

### Expected Effort
- Re-capturing all screenshots should take < 15 minutes for a builder agent
- No special tooling beyond Playwright (if used) should be required
- Process should be documented or self-evident from script naming

### Pass Criteria
- Either an automated capture script exists OR clear recapture instructions are documented
- A deleted screenshot can be regenerated following the documented process