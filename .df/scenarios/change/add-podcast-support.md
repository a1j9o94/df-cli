---
name: add-podcast-support
type: change
spec_id: run_01KK7SEAMQH4864S3Q22NACE6H
created_by: agt_01KK7SEAMS9TJ2REHZD0ZZYG49
---

## Changeability Scenario: Add podcast support

### Modification Description
If llm-youtube adds podcast support later (e.g., podcast RSS feeds, Spotify podcast URLs), the dark research video command should work with podcast URLs without any changes to the Dark Factory codebase.

### Affected Areas
- src/commands/research/video.ts — Should NOT need changes (no URL validation)
- src/commands/research/video-action.ts — Should NOT need changes (passes URL through)
- src/commands/research/video-utils.ts — Should NOT need changes (delegates to llm-youtube)
- src/commands/research/video-detect.ts — MAY need changes if we want to auto-detect podcast URLs in specs
- src/utils/url-detection.ts — MAY need changes if we want to auto-detect podcast URLs in specs

### Expected Effort
- Zero changes needed for basic podcast URL support (pass-through design)
- Minor regex addition (~5 lines) if we want podcast URLs auto-detected in spec content
- No database schema changes, no type changes, no command interface changes

### Pass/Fail Criteria
- PASS: The video command's URL handling is pass-through (no allowlist, no URL validation). Only the URL detection functions would need updating for new URL patterns. Confirm by inspecting: video.ts and video-action.ts contain no URL format checks or URL allowlists.
- FAIL: video command validates or restricts URL formats, requiring code changes to accept new URL types