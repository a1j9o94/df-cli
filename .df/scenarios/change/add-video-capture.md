---
name: add-video-capture
type: change
spec_id: run_01KK7R4Y1NWJRH426C68FK58CZ
created_by: agt_01KK7R4Y1TEX0SQCM76106T1F2
---

Modification: Add screen recording (video capture) support for visual runs alongside existing screenshot capture.

Expected changes:
1. Add a 'type' field to manifest.json entries (values: 'screenshot' | 'video') — backward compatible since existing entries are implicitly screenshots
2. Add video capture step in builder/evaluator agent prompts (parallel to screenshot instructions)
3. Add a video player component in the dashboard Output tab gallery (detect type field, render <video> for videos, <img> for screenshots)
4. Add video file serving in API endpoint (extend GET /api/runs/:id/screenshots/:filename to serve video MIME types)

Areas that should NOT need changes:
- Manifest JSON structure (just adding optional 'type' field)
- API contract (same endpoint, different content-type)
- Highlights extraction or module summary logic
- CLI export format (videos referenced but not embedded in markdown; HTML export could embed as base64 video)

Expected effort: Small-medium. 3-4 files modified, no architectural changes. The manifest format and API are designed to be extensible.

Pass criteria: Video capture can be added by modifying agent prompts + adding gallery rendering for videos, without changing storage paths, manifest schema (beyond adding type field), or API route structure.