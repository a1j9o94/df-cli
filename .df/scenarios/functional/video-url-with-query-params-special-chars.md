---
name: video-url-with-query-params-special-chars
type: functional
spec_id: run_01KJT1F6B8P7286PNQFFEBC6YK
created_by: agt_01KJT3KC462DV5CQBFGBE4B3PQ
---

## Scenario: Video URL with special query parameters

### Steps
1. Run: dark research video <agent-id> 'https://www.youtube.com/watch?v=abc123&list=PLxyz&t=42s'
2. Verify the URL is passed through to llm-youtube without mangling
3. Verify the full URL including &list= and &t= params is preserved in the research artifact label and content
4. Verify the URL detection regex in video-detect.ts also matches URLs with additional query parameters

### Pass/Fail Criteria
- PASS: URL with query params handled correctly
- FAIL: Query params stripped, URL mangled, or regex fails to match