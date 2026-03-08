---
name: add-video-capture-changeability
type: change
spec_id: run_01KK7SEJD8Z1CHN7Z2B1ZDT9P9
created_by: agt_01KK7SEJD9V7MRX6KC86N28S5K
---

MODIFICATION: Add screen recording (video capture) for visual runs in addition to screenshots.

DESCRIPTION: A new requirement to capture short screen recordings during builder TDD cycles and evaluator validation, displayed as video players in the Output tab gallery.

EXPECTED CHANGES:
1. Add a 'type' field to manifest.json entries ('image' | 'video') — manifest format designed to be extensible.
2. Add video capture step in builder and evaluator agents (new capture function alongside screenshot capture).
3. Add video player component in the gallery UI (alongside image thumbnails).
4. No changes needed to: API contract (GET /api/runs/:id/screenshots serves all media), storage path convention, or highlight extraction.

AFFECTED AREAS:
- src/utils/screenshot-capture.ts (or equivalent) — add video recording function
- Builder/evaluator agent prompts — add video capture instructions
- Dashboard Output tab gallery — add video player for type='video' entries
- Manifest types — add optional 'type' field

EFFORT ESTIMATE: Low-medium. The manifest format and API routes are already generic enough. Main work is the capture implementation and gallery rendering.

PASS CRITERIA:
- Adding video support requires NO changes to the manifest schema structure (only adding a new field value).
- API routes serve video files without modification (same endpoint pattern).
- Gallery component handles new type without restructuring.