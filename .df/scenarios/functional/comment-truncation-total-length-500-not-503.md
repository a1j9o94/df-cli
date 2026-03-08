---
name: comment-truncation-total-length-500-not-503
type: functional
spec_id: run_01KK713FAZE5AV73F5HB66BPVF
created_by: agt_01KK72R5ANW6X2DESTYMTFZJBE
---

Test: Comment truncation must produce output of exactly 500 chars total, not 503. Steps: 1. Create IssueData with one non-bot comment having body of 600 chars. 2. Call generateSpecFromIssue. 3. Find the comment body in 'Context from Discussion' section. 4. Measure total length of the truncated body. 5. Verify length is exactly 500 (i.e., slice(0,497) + '...' = 500), NOT 503 (slice(0,500) + '...'). Current bug: spec-generator.ts formatComments uses slice(0, MAX_COMMENT_LENGTH) + '...' where MAX_COMMENT_LENGTH=500, producing 503 chars. Should be slice(0, MAX_COMMENT_LENGTH - 3) + '...' = 500. Pass criteria: Truncated comment body is exactly 500 characters including ellipsis.