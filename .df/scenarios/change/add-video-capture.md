---
name: add-video-capture
type: change
spec_id: run_01KJSYMVTRZA22SC742GEMEWDJ
created_by: agt_01KJSYMVTT7H090YHJERTJN6FG
---

## Add Video Capture

### Modification Description
Add screen recording capability (video) for visual runs, in addition to screenshots. Videos would be captured during TDD cycles and evaluation.

### Expected Changes
1. Add a video capture step in builder/evaluator agents (new capture function alongside screenshot capture)
2. Add a video player component in the gallery UI (in addition to image lightbox)
3. Add a 'type' field to manifest entries to distinguish images from videos

### Areas That Should NOT Change
- manifest.json format should remain backward-compatible (type field is additive)
- API contract for GET /api/runs/:id/screenshots should still work (videos are additional entries)
- CLI export format should not break (videos appear as links in markdown, embedded in HTML)
- Highlight extraction is completely unaffected
- Module summary cards are completely unaffected

### Expected Effort
- New video capture utility: ~50 lines (parallel to screenshot capture)
- Manifest type field addition: ~5 lines (additive, not breaking)
- Gallery video player component: ~40 lines (new component alongside image viewer)
- API route for video serving: ~10 lines (same pattern as image serving, different content-type)
- Total: ~100 lines across 4 files

### Pass Criteria
- Adding video support requires NO changes to highlights, module summaries, or CLI export core logic
- manifest.json schema is extended (not replaced) — old entries without type default to image
- The screenshot API endpoint path can serve both images and videos