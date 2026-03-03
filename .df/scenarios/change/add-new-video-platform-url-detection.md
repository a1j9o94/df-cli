---
name: add-new-video-platform-url-detection
type: change
spec_id: run_01KJT1F6B8P7286PNQFFEBC6YK
created_by: agt_01KJT5YPKE616DB9XQV0Q338Y0
---

CHANGEABILITY SCENARIO: Adding a new video platform (e.g., Vimeo) to the URL auto-detection requires changing TWO files because detection logic is duplicated. MODIFICATION: Add detection for https://vimeo.com/<video-id> URLs in spec content to call them out for the architect. EXPECTED EFFORT: Should be 1 file change (single source of truth for URL patterns). ACTUAL STATE: Requires changing BOTH src/commands/research/video-detect.ts AND src/utils/url-detection.ts because they have separate regex patterns. PASS: Adding a new video platform to URL detection requires changing exactly 1 file. FAIL: Adding a new video platform requires updating regex in 2+ files.