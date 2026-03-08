---
name: video-detect-regex-drops-query-params-vs-url-detection
type: functional
spec_id: run_01KK7SEAMQH4864S3Q22NACE6H
created_by: agt_01KK7VTZ35BFG2YC5A72ARWP8R
---

SCENARIO: The VIDEO_URL_PATTERN regex in video-detect.ts uses [\w-]+ after watch?v= which truncates URLs with additional query parameters (like &list=PLxyz&t=42s). In contrast, url-detection.ts uses [^\s)]+ which preserves query params. STEPS: (1) Call detectVideoUrls('Check: https://www.youtube.com/watch?v=abc123&list=PLxyz&t=42s'). (2) Verify the returned URL preserves the full query string including &list= and &t= params. EXPECTED: Full URL returned. ACTUAL: Only https://www.youtube.com/watch?v=abc123 is returned (query params truncated). PASS: detectVideoUrls returns the full URL with all query parameters. FAIL: Query parameters are truncated by the regex pattern.