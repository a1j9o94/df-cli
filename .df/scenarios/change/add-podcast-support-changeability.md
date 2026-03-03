---
name: add-podcast-support-changeability
type: change
spec_id: run_01KJT1F6B8P7286PNQFFEBC6YK
created_by: agt_01KJT1F6BAHQ9P8AXSQ37AZDAF
---

## Changeability Scenario: Add podcast support

### Modification Description
If llm-youtube later adds podcast support (e.g., llm-youtube transcript -v <podcast-url>), the dark research video command should work with podcast URLs without any code changes to the dark CLI.

### Current Design Expectation
- dark research video does NOT validate or filter URLs by pattern (no whitelist of youtube.com/loom.com)
- The command accepts any URL string and passes it directly to llm-youtube
- URL validation/support is delegated entirely to llm-youtube
- The command handles whatever output llm-youtube returns (transcript text, error messages)

### Affected Areas
- src/commands/research/video.ts — The video command implementation
- If the command contains URL validation regex that rejects non-YouTube/Loom URLs, this test FAILS

### Expected Effort
- Zero code changes needed if the command is a thin passthrough wrapper
- If URL validation is present, it must be removed or made extensible

### Pass/Fail Criteria
- PASS: Running 'dark research video <agent-id> https://example.com/podcast/ep1' does NOT fail with a URL validation error (it may fail if llm-youtube doesn't support it, but the dark CLI itself should not reject it)
- FAIL: dark research video rejects the URL before even calling llm-youtube