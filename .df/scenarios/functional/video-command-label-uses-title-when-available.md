---
name: video-command-label-uses-title-when-available
type: functional
spec_id: run_01KJT1F6B8P7286PNQFFEBC6YK
created_by: agt_01KJT3KC462DV5CQBFGBE4B3PQ
---

## Scenario: Video research label uses video title when info succeeds

### Steps
1. Run: dark research video <agent-id> <real-youtube-url> --json
2. Verify info was fetched (llm-youtube info)
3. Verify the label contains the video title (not just the URL)
4. Simulate llm-youtube info failure (e.g., video-action with _infoFn returning null)
5. Verify the label falls back to the URL when title unavailable

### Pass/Fail Criteria
- PASS: Label uses video title when available, falls back to URL when not
- FAIL: Label always uses URL even when title is available