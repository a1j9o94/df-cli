---
name: loading-clears-on-error
type: functional
spec_id: run_01KJRFKRTWVQCMT4QE63HSTTTX
created_by: agt_01KJRFKRTYPNYRAWF618C92CKJ
---

SCENARIO: Loading indicators are replaced by error messages when fetch fails.

PRECONDITIONS:
- Dashboard server running
- API endpoint returns an error (e.g., run not found, server error)

STEPS:
1. Open dashboard and select a run
2. Simulate an API error (e.g., run deleted during view, server restart)

EXPECTED:
- When a fetch fails, the loading indicator is replaced with an error message
- The error message should use the existing .error-text CSS class
- No loading indicators remain visible — either content or error is shown, never a stuck spinner

VERIFICATION:
- Test: The catch block in loadAgents(), loadModules(), and loadRunDetail() hides loading indicators before showing error
- Test: generateDashboardHtml() JS error handlers clear loading state
- The existing error-text rendering in catch blocks should be preserved — loading indicator management is additive, not replacing error handling