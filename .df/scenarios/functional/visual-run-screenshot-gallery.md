---
name: visual-run-screenshot-gallery
type: functional
spec_id: run_01KK7SEJD8Z1CHN7Z2B1ZDT9P9
created_by: agt_01KK7SEJD9V7MRX6KC86N28S5K
---

PRECONDITIONS: A completed run exists whose spec title contains the word 'dashboard' (a visual keyword). The builder captured at least 2 screenshots during TDD cycles. The evaluator captured at least 1 screenshot during validation.

STEPS:
1. Open the dashboard and navigate to the completed run's detail view.
2. Verify a tab labeled 'Output' exists alongside Overview, Modules, and Validation.
3. Click the Output tab.
4. Verify a screenshot gallery is displayed with thumbnail images.
5. Verify each thumbnail shows: caption text, a phase badge ('Build' or 'Eval'), module name, and timestamp.
6. Verify build screenshots appear before evaluator screenshots (chronological ordering).
7. Click a thumbnail to expand it full-size.
8. Verify the expanded view shows the full-width image with prev/next navigation controls.
9. Navigate using prev/next and verify correct image transitions.

EXPECTED:
- Output tab is visible and clickable.
- Gallery renders with all screenshots from manifest.json.
- Phase badges correctly distinguish Build vs Eval screenshots.
- Expanded view with navigation works.

PASS CRITERIA:
- GET /api/runs/:id/screenshots returns manifest JSON array.
- GET /api/runs/:id/screenshots/:filename returns image binary with correct content-type.
- Dashboard Output tab renders gallery grid with thumbnails.
- Click-to-expand and prev/next navigation functional.