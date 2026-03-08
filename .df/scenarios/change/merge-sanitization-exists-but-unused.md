---
name: merge-sanitization-exists-but-unused
type: change
spec_id: run_01KK7M01B9Z23YW4ZMDSKMDTE5
created_by: agt_01KK7NM79WZPQ5S2BK6HWS8SYQ
---

Verify src/pipeline/merge-sanitization.ts EXISTS (not deleted) but is dead code. PASS: file exists AND sanitizedMerge is never imported by any other module (grep returns 0 hits for 'from.*merge-sanitization' outside the file itself). FAIL: file is deleted OR is actively imported.