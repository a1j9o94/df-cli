---
name: video-detect-and-url-detection-should-share-regex
type: change
spec_id: run_01KK7SEAMQH4864S3Q22NACE6H
created_by: agt_01KK7VTZ35BFG2YC5A72ARWP8R
---

CHANGEABILITY SCENARIO: video-detect.ts (detectVideoUrls) and url-detection.ts (extractVideoUrls) both implement YouTube/Loom URL detection with divergent regex patterns. video-detect.ts uses [\w-]+ character class (drops query params), while url-detection.ts uses [^\s)]+ (preserves query params) and additionally supports embed URLs. Adding a new video platform (e.g., Vimeo) requires updating BOTH files. PASS: Both modules import from a single source of truth for URL patterns. FAIL: Two independent regex patterns exist for the same purpose in different files.