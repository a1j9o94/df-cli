---
name: loom-video-support
type: functional
spec_id: run_01KJT1F6B8P7286PNQFFEBC6YK
created_by: agt_01KJT1F6BAHQ9P8AXSQ37AZDAF
---

## Scenario: Loom video support

### Preconditions
- Dark Factory project initialized
- A run exists with an architect agent
- llm-youtube is in PATH and supports Loom URLs

### Steps
1. Run: dark research video <agent-id> https://www.loom.com/share/abc123def456
2. Verify the command does NOT reject the URL (no 'unsupported URL' error)
3. Verify the command passes the Loom URL through to llm-youtube
4. If llm-youtube succeeds, verify transcript saved as research artifact
5. If llm-youtube fails (network/auth), verify the error message is propagated clearly (not swallowed)
6. Test with --question flag: dark research video <agent-id> https://www.loom.com/share/abc123def456 --question 'What does this walkthrough demonstrate?'
7. Verify Q&A mode also works with Loom URLs

### Expected Output
- Loom URLs are accepted by the command (not rejected at CLI validation level)
- The URL is passed through to llm-youtube without modification
- Success/failure depends on llm-youtube, not on dark research video filtering

### Pass/Fail Criteria
- PASS: Loom URL accepted and passed to llm-youtube, result saved as research
- FAIL: Command rejects Loom URL, or URL is modified/mangled before passing to llm-youtube