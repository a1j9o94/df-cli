---
name: comment-truncation-exact-length
type: functional
spec_id: run_01KJSS4TD4WH5VKGWK6YWSWJZQ
created_by: agt_01KJSY17XRYR0TZDX4VKPD6AB7
---

Setup: Issue with a comment that has a body of exactly 600 characters.\n\nSteps:\n1. Create an IssueData with one non-bot comment having body = 'x'.repeat(600)\n2. Generate spec from this issue data\n3. Read the Context from Discussion section\n4. Measure the length of the comment body in the output\n5. Verify the body is truncated to EXACTLY 500 characters (including any '...' suffix)\n\nPass criteria: Truncated comment bodies must be at most 500 characters total. If '...' is appended, the visible text should be 497 chars + '...' = 500 total. The spec says 'first 500 chars of content' — the resulting body must not exceed 500 characters.