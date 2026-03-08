---
name: visual-run-screenshot-gallery
type: functional
spec_id: run_01KK7R4Y1NWJRH426C68FK58CZ
created_by: agt_01KK7R4Y1TEX0SQCM76106T1F2
---

Preconditions: A completed run exists for a spec whose title contains 'dashboard UI'. The run has screenshots stored in .df/runs/<run-id>/screenshots/ with a valid manifest.json containing at least 2 build-phase and 1 eval-phase screenshot entries.

Steps:
1. GET /api/runs/<run-id>/screenshots — expect 200 with JSON array of manifest entries
2. Verify each entry has: filename, phase ('build' or 'eval'), module, step, caption, timestamp
3. Load dashboard at / and navigate to the run detail view
4. Click the 'Output' tab (should be 4th tab after Overview, Modules, Validation)
5. Verify a screenshot gallery grid is rendered
6. Verify each thumbnail shows: image, caption, phase badge, module name, timestamp
7. Verify build screenshots appear before eval screenshots (chronological order)
8. Click a thumbnail — verify it expands to full-width view
9. In expanded view, verify prev/next navigation buttons exist and work

Pass criteria:
- API returns valid manifest JSON
- Output tab renders with gallery grid
- Screenshots ordered chronologically (build first, eval last)
- Click-to-expand works
- Prev/next navigation cycles through images
- Phase badges show 'Build' or 'Eval' text

Fail criteria:
- Output tab missing or empty when screenshots exist
- Screenshots not ordered correctly
- Expanded view doesn't show or navigation broken
- API returns 404 or malformed JSON